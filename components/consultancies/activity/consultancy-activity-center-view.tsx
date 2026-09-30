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

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">📋</span>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Central de Atividades</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Acompanhe em tempo real e com transparência tudo o que acontece na consultoria.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* View toggle */}
          <div className="flex items-center bg-muted/40 p-1 rounded-lg border border-border/50 text-xs">
            <button
              type="button"
              onClick={() => setViewMode("TIMELINE")}
              className={`px-3 py-1 rounded-md font-medium transition ${
                viewMode === "TIMELINE"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Linha do Tempo
            </button>
            <button
              type="button"
              onClick={() => setViewMode("TABLE")}
              className={`px-3 py-1 rounded-md font-medium transition ${
                viewMode === "TABLE"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Tabela
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 px-3 py-1.5 rounded-lg border border-border/50">
            <span>Total:</span>
            <span className="font-semibold text-foreground">{totalEvents}</span>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-card/40 backdrop-blur-sm border border-border/50 rounded-xl p-4 space-y-4 shadow-xs">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por usuário, aluno, resumo ou ID..."
              className="w-full bg-background/60 border border-border/60 rounded-lg px-3.5 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  applyFilters({ search: "" });
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
              >
                Limpar
              </button>
            )}
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition shadow-xs"
          >
            Filtrar
          </button>
        </form>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-border/30">
          {/* Período */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Período</label>
            <select
              value={period}
              onChange={(e) => handlePeriodChange(e.target.value)}
              className="w-full bg-background/60 border border-border/60 rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="ALL">Todo o histórico</option>
              <option value="TODAY">Hoje</option>
              <option value="WEEK">Últimos 7 dias</option>
              <option value="MONTH">Últimos 30 dias</option>
            </select>
          </div>

          {/* Papel */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Função / Papel</label>
            <select
              value={role}
              onChange={(e) => handleRoleChange(e.target.value)}
              className="w-full bg-background/60 border border-border/60 rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
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
            <label className="block text-xs font-medium text-muted-foreground mb-1">Módulo</label>
            <select
              value={selectedModule}
              onChange={(e) => handleModuleChange(e.target.value)}
              className="w-full bg-background/60 border border-border/60 rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
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

      {/* Main Content Area */}
      {initialEvents.length === 0 ? (
        <div className="bg-card/40 backdrop-blur-sm border border-border/50 rounded-xl p-12 text-center space-y-3">
          <span className="text-3xl">📋</span>
          <h3 className="text-base font-medium text-foreground">Nenhuma atividade registrada</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Nenhuma ação encontrada com os filtros selecionados. Altere os filtros ou aguarde novas atividades na consultoria.
          </p>
        </div>
      ) : viewMode === "TIMELINE" ? (
        /* Timeline View */
        <div className="space-y-8">
          {Object.entries(groupedEvents).map(([dayBucket, events]) => (
            <div key={dayBucket} className="space-y-3">
              {/* Day header */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-500 uppercase tracking-wider bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
                  {dayBucket}
                </span>
                <div className="h-px flex-1 bg-border/40" />
              </div>

              {/* Event cards */}
              <div className="space-y-2.5">
                {events.map((evt) => {
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
                    <div
                      key={evt.public_id}
                      onClick={() => setSelectedEvent(evt)}
                      className="bg-card/50 hover:bg-card/80 border border-border/50 hover:border-emerald-500/30 rounded-xl p-4 transition cursor-pointer shadow-2xs group flex items-start gap-4"
                    >
                      {/* Time pill */}
                      <div className="shrink-0 font-mono text-xs font-semibold text-muted-foreground group-hover:text-emerald-500 pt-0.5">
                        {formatTimeOnly(evt.created_at)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-semibold text-sm text-foreground">
                            {actor}
                          </span>
                          <span
                            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${roleConfig.color}`}
                          >
                            {roleConfig.label}
                          </span>
                          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <span>{modConfig.icon}</span>
                            <span>{modConfig.label}</span>
                          </span>
                        </div>

                        <p className="text-sm text-foreground/90 leading-relaxed">
                          {fullSentence}
                        </p>
                      </div>

                      {/* Detail CTA */}
                      <div className="shrink-0 text-xs text-muted-foreground group-hover:text-emerald-500 flex items-center gap-1">
                        <span>Ver detalhes</span>
                        <span>→</span>
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
