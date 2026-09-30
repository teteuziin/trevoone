"use client";

import React, { useState, useTransition } from "react";
import { updateConsultancyPlatformAiLimitAction } from "@/app/admin/ia/actions";

interface ConsultancySummary {
  consultancyId: number;
  consultancyPublicId: string;
  consultancyName: string;
  consultancySlug: string;
  timezone: string;
  dailyLimit: number;
  isEnabled: boolean;
  usedToday: number;
  remainingToday: number;
  lastUsedAt: string | null;
  status: string;
}

interface Props {
  consultancies: ConsultancySummary[];
}

export function PlatformAdminAiView({ consultancies: initialList }: Props) {
  const [list, setList] = useState(initialList);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedConsultancy, setSelectedConsultancy] = useState<ConsultancySummary | null>(null);
  const [editLimit, setEditLimit] = useState<number>(20);
  const [editEnabled, setEditEnabled] = useState<boolean>(true);
  const [editNotes, setEditNotes] = useState<string>("");
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const filtered = list.filter(
    (c) =>
      c.consultancyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.consultancySlug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalUsedToday = list.reduce((acc, c) => acc + c.usedToday, 0);
  const activeCount = list.filter((c) => c.isEnabled && c.dailyLimit > 0).length;

  const openEditModal = (c: ConsultancySummary) => {
    setSelectedConsultancy(c);
    setEditLimit(c.dailyLimit);
    setEditEnabled(c.isEnabled);
    setEditNotes("");
    setErrorMsg(null);
  };

  const handleSave = () => {
    if (!selectedConsultancy) return;
    setErrorMsg(null);

    startTransition(async () => {
      const res = await updateConsultancyPlatformAiLimitAction(
        selectedConsultancy.consultancyId,
        editLimit,
        editEnabled,
        editNotes || null
      );

      if (!res.success) {
        setErrorMsg(res.error || "Erro ao salvar.");
      } else {
        setList((prev) =>
          prev.map((item) =>
            item.consultancyId === selectedConsultancy.consultancyId
              ? {
                  ...item,
                  dailyLimit: editLimit,
                  isEnabled: editEnabled,
                  remainingToday: editEnabled ? Math.max(0, editLimit - item.usedToday) : 0,
                  status: !editEnabled ? "Desativado" : Math.max(0, editLimit - item.usedToday) === 0 ? "Esgotado" : "Ativo",
                }
              : item
          )
        );
        setSelectedConsultancy(null);
      }
    });
  };

  const formatLastUsed = (iso: string | null) => {
    if (!iso) return "Nunca utilizado";
    try {
      return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(iso));
    } catch {
      return iso;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">✨</span>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Consumo de IA / Governança de Cotas
            </h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Defina o teto diário de utilizações de IA por consultoria para controlar custos da plataforma.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card/50 border border-border/50 rounded-xl p-4 shadow-2xs">
          <span className="text-xs text-muted-foreground uppercase font-semibold">
            Importações Hoje (Global)
          </span>
          <div className="text-2xl font-bold text-foreground mt-1">{totalUsedToday}</div>
        </div>
        <div className="bg-card/50 border border-border/50 rounded-xl p-4 shadow-2xs">
          <span className="text-xs text-muted-foreground uppercase font-semibold">
            Consultorias com IA Ativa
          </span>
          <div className="text-2xl font-bold text-emerald-500 mt-1">{activeCount}</div>
        </div>
        <div className="bg-card/50 border border-border/50 rounded-xl p-4 shadow-2xs">
          <span className="text-xs text-muted-foreground uppercase font-semibold">
            Total de Consultorias
          </span>
          <div className="text-2xl font-bold text-foreground mt-1">{list.length}</div>
        </div>
      </div>

      {/* Search and Table */}
      <div className="bg-card/40 backdrop-blur-sm border border-border/50 rounded-xl overflow-hidden shadow-xs space-y-4 p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar consultoria por nome ou slug..."
              className="w-full bg-background/60 border border-border/60 rounded-lg px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <span className="text-xs text-muted-foreground">
            Exibindo {filtered.length} consultorias
          </span>
        </div>

        <div className="overflow-x-auto border-t border-border/30 pt-2">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 border-b border-border/50 text-muted-foreground uppercase font-semibold text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Consultoria</th>
                <th className="py-3 px-4">Limite Diário</th>
                <th className="py-3 px-4">Usado Hoje</th>
                <th className="py-3 px-4">Restante Hoje</th>
                <th className="py-3 px-4">Última Utilização</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {filtered.map((c) => (
                <tr key={c.consultancyId} className="hover:bg-muted/30 transition-colors">
                  <td className="py-3 px-4 font-semibold text-foreground">
                    <div>{c.consultancyName}</div>
                    <div className="text-[10px] font-normal font-mono text-muted-foreground">
                      /{c.consultancySlug}
                    </div>
                  </td>
                  <td className="py-3 px-4 font-mono font-medium text-foreground">
                    {c.dailyLimit} / dia
                  </td>
                  <td className="py-3 px-4 font-mono font-medium text-foreground">
                    {c.usedToday}
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-foreground">
                    <span
                      className={
                        c.remainingToday === 0
                          ? "text-rose-400"
                          : c.remainingToday <= 3
                          ? "text-amber-400"
                          : "text-emerald-400"
                      }
                    >
                      {c.remainingToday}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-muted-foreground text-[11px]">
                    {formatLastUsed(c.lastUsedAt)}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                        c.status === "Ativo"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : c.status === "Esgotado"
                          ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                      }`}
                    >
                      {c.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => openEditModal(c)}
                      className="px-2.5 py-1 bg-muted/60 hover:bg-emerald-500/20 hover:text-emerald-400 rounded text-[11px] font-medium transition"
                    >
                      Editar limite
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Limit Modal */}
      {selectedConsultancy && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setSelectedConsultancy(null)}
        >
          <div
            className="w-full max-w-md bg-card border border-border rounded-2xl p-6 space-y-5 shadow-2xl animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <span className="text-xs text-emerald-500 font-semibold uppercase tracking-wider">
                Platform Admin
              </span>
              <h2 className="text-lg font-bold text-foreground mt-0.5">
                Definir Limite de IA — {selectedConsultancy.consultancyName}
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Este limite é o teto máximo diário compartilhado por todos os membros desta consultoria.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                {errorMsg}
              </div>
            )}

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-foreground mb-1">
                  Limite Diário de Importações
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="1000"
                    value={editLimit}
                    onChange={(e) => setEditLimit(Number(e.target.value))}
                    className="w-32 bg-background border border-border rounded-lg px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                  />
                  <span className="text-muted-foreground">importações / dia</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Defina 0 para desativar o uso de IA nesta consultoria.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="enableAiCheck"
                  checked={editEnabled}
                  onChange={(e) => setEditEnabled(e.target.checked)}
                  className="rounded border-border text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="enableAiCheck" className="text-foreground font-medium cursor-pointer">
                  Módulo de IA ativado para esta consultoria
                </label>
              </div>

              <div>
                <label className="block font-medium text-foreground mb-1">
                  Observações / Justificativa (opcional)
                </label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Ex: Plano Pro liberado, aumento de demanda..."
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/40">
              <button
                type="button"
                onClick={() => setSelectedConsultancy(null)}
                className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-lg text-xs font-medium transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleSave}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition shadow-xs"
              >
                {isPending ? "Salvando..." : "Salvar Limite"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
