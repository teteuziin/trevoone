"use client";

import React, { useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import type { ActivityEventRow } from "@/lib/consultancies/activity-log";

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
  STUDENT: { label: "Aluno", icon: "🎓" },
  PERSONAL: { label: "Treinos", icon: "🏋️" },
  NUTRITION: { label: "Nutrição", icon: "🥗" },
  FORMS: { label: "Formulários", icon: "📋" },
  CONSULTATIONS: { label: "Consultas", icon: "📅" },
  FILES: { label: "Arquivos", icon: "📁" },
  AI: { label: "IA", icon: "✨" },
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

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }).format(d);
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">📊</span>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Atividades</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Acompanhe as principais ações realizadas na sua consultoria em tempo real.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 px-3 py-1.5 rounded-lg border border-border/50 self-start md:self-auto">
          <span>Total registrado:</span>
          <span className="font-semibold text-foreground">{totalEvents}</span>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-card/40 backdrop-blur-sm border border-border/50 rounded-xl p-4 space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por ator, aluno, resumo ou ID..."
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
            className="px-4 py-2 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 rounded-lg text-sm font-medium transition"
          >
            Buscar
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
            <label className="block text-xs font-medium text-muted-foreground mb-1">Papel</label>
            <select
              value={role}
              onChange={(e) => handleRoleChange(e.target.value)}
              className="w-full bg-background/60 border border-border/60 rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="ALL">Todos os papéis</option>
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
              <option value="STUDENT">Alunos / Progresso</option>
              <option value="MEMBERS">Membros</option>
              <option value="FORMS">Formulários</option>
              <option value="CONSULTATIONS">Consultas</option>
              <option value="AUTH">Autenticação</option>
              <option value="AI">Inteligência Artificial</option>
              <option value="ADMIN">Gestão</option>
            </select>
          </div>
        </div>
      </div>

      {/* Events Table / Timeline */}
      <div className="bg-card/40 backdrop-blur-sm border border-border/50 rounded-xl overflow-hidden shadow-sm">
        {initialEvents.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <span className="text-3xl">📭</span>
            <h3 className="text-base font-medium text-foreground">Nenhuma atividade registrada</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Nenhuma ação encontrada com os filtros selecionados. Altere os filtros ou aguarde novas atividades na consultoria.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 border-b border-border/50 text-muted-foreground uppercase font-semibold text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Data / Hora</th>
                  <th className="py-3 px-4">Ator</th>
                  <th className="py-3 px-4">Papel</th>
                  <th className="py-3 px-4">Módulo</th>
                  <th className="py-3 px-4">Ação</th>
                  <th className="py-3 px-4">Aluno / Relacionado</th>
                  <th className="py-3 px-4">Resumo</th>
                  <th className="py-3 px-4 text-right">Detalhes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {initialEvents.map((evt) => {
                  const roleConfig = ROLE_LABELS[evt.actor_role] || {
                    label: evt.actor_role,
                    color: "bg-muted text-muted-foreground border-border",
                  };
                  const modConfig = MODULE_LABELS[evt.module] || {
                    label: evt.module,
                    icon: "📌",
                  };

                  return (
                    <tr
                      key={evt.public_id}
                      onClick={() => setSelectedEvent(evt)}
                      className="hover:bg-muted/30 transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-4 whitespace-nowrap text-muted-foreground font-mono text-[11px]">
                        {formatDate(evt.created_at)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-foreground">
                          {evt.actor_name || "Usuário"}
                        </div>
                        <div className="text-[10px] text-muted-foreground truncate max-w-[140px]">
                          {evt.actor_email || `ID ${evt.actor_user_id}`}
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
                      <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px] text-foreground">
                        {evt.action}
                      </td>
                      <td className="py-3 px-4">
                        {evt.subject_name ? (
                          <div>
                            <span className="font-medium text-foreground">{evt.subject_name}</span>
                            {evt.subject_email && (
                              <div className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                                {evt.subject_email}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground/60">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 max-w-xs truncate text-foreground/90">
                        {evt.summary}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          className="px-2 py-1 bg-muted/60 group-hover:bg-primary/20 group-hover:text-primary rounded text-[10px] font-medium transition"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEvent(evt);
                          }}
                        >
                          Ver
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Event Details Drawer / Modal */}
      {selectedEvent && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex justify-end"
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
                  Detalhes do Evento
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted/50"
              >
                ✕
              </button>
            </div>

            {/* Core Info Cards */}
            <div className="space-y-4 text-xs">
              <div className="bg-muted/30 rounded-lg p-3 border border-border/40 space-y-2">
                <div className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">
                  Resumo
                </div>
                <div className="text-sm font-semibold text-foreground">
                  {selectedEvent.summary}
                </div>
                <div className="text-muted-foreground">
                  Registrado em: <span className="font-mono text-foreground">{formatDate(selectedEvent.created_at)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/20 rounded-lg p-3 border border-border/30">
                  <div className="text-[10px] uppercase font-semibold text-muted-foreground">Módulo</div>
                  <div className="font-medium text-foreground mt-1">
                    {MODULE_LABELS[selectedEvent.module]?.label || selectedEvent.module}
                  </div>
                </div>
                <div className="bg-muted/20 rounded-lg p-3 border border-border/30">
                  <div className="text-[10px] uppercase font-semibold text-muted-foreground">Ação</div>
                  <div className="font-mono font-medium text-foreground mt-1">
                    {selectedEvent.action}
                  </div>
                </div>
              </div>

              <div className="bg-muted/20 rounded-lg p-3 border border-border/30 space-y-2">
                <div className="text-[10px] uppercase font-semibold text-muted-foreground">Ator da Ação</div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-foreground">
                      {selectedEvent.actor_name || "Usuário do sistema"}
                    </div>
                    <div className="text-muted-foreground">{selectedEvent.actor_email || `ID ${selectedEvent.actor_user_id}`}</div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                      ROLE_LABELS[selectedEvent.actor_role]?.color || "bg-muted text-muted-foreground border-border"
                    }`}
                  >
                    {ROLE_LABELS[selectedEvent.actor_role]?.label || selectedEvent.actor_role}
                  </span>
                </div>
              </div>

              {selectedEvent.subject_name && (
                <div className="bg-muted/20 rounded-lg p-3 border border-border/30 space-y-1">
                  <div className="text-[10px] uppercase font-semibold text-muted-foreground">Aluno / Paciente Relacionado</div>
                  <div className="font-semibold text-foreground">{selectedEvent.subject_name}</div>
                  {selectedEvent.subject_email && (
                    <div className="text-muted-foreground">{selectedEvent.subject_email}</div>
                  )}
                </div>
              )}

              <div className="bg-muted/20 rounded-lg p-3 border border-border/30 space-y-1">
                <div className="text-[10px] uppercase font-semibold text-muted-foreground">Recurso Afetado</div>
                <div className="flex items-center justify-between font-mono text-[11px]">
                  <span className="text-muted-foreground">Tipo:</span>
                  <span className="text-foreground">{selectedEvent.resource_type}</span>
                </div>
                {selectedEvent.resource_public_id && (
                  <div className="flex items-center justify-between font-mono text-[11px]">
                    <span className="text-muted-foreground">ID do Recurso:</span>
                    <span className="text-foreground truncate max-w-[200px]">{selectedEvent.resource_public_id}</span>
                  </div>
                )}
              </div>

              {/* Safe Metadata Viewer */}
              {Boolean(selectedEvent.metadata_json) && (
                <div className="space-y-1.5">
                  <div className="text-[10px] uppercase font-semibold text-muted-foreground">Metadados Auditáveis (Seguros)</div>
                  <pre className="bg-background/80 p-3 rounded-lg border border-border/60 text-[11px] font-mono overflow-x-auto text-foreground/90 max-h-60">
                    {JSON.stringify(selectedEvent.metadata_json, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            {/* Close Button */}
            <div className="pt-4 border-t border-border/40">
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="w-full py-2 bg-muted/60 hover:bg-muted text-foreground font-medium rounded-lg text-xs transition"
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
