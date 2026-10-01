"use client";

import React, { useState, useTransition } from "react";
import {
  updateConsultancyRoleAiLimitsAction,
  updateConsultancyMemberAiOverrideAction,
  removeConsultancyMemberAiOverrideAction,
} from "@/app/consultoria/[slug]/configuracoes/ia/actions";
import type { ConsultancyAiQuotaInfo } from "@/lib/ai/quotas";

interface MemberOption {
  membershipId: number;
  fullName: string;
  email: string;
  role: string;
}

interface MemberOverrideItem {
  membershipId: number;
  userFullName: string;
  userEmail: string;
  role: string;
  dailyLimit: number;
}

interface Props {
  consultancySlug: string;
  consultancyQuota: ConsultancyAiQuotaInfo;
  initialRoleLimits: {
    personal: number;
    nutritionist: number;
  };
  initialMemberOverrides: MemberOverrideItem[];
  availableMembers: MemberOption[];
}

export function ConsultancyAiSettingsView({
  consultancySlug,
  consultancyQuota,
  initialRoleLimits,
  initialMemberOverrides,
  availableMembers,
}: Props) {
  const [personalLimit, setPersonalLimit] = useState(initialRoleLimits.personal);
  const [nutritionistLimit, setNutritionistLimit] = useState(initialRoleLimits.nutritionist);
  const [memberOverrides, setMemberOverrides] = useState<MemberOverrideItem[]>(initialMemberOverrides);

  // Form to add/update member override
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
  const [memberOverrideLimit, setMemberOverrideLimit] = useState<number>(5);

  const [isPending, startTransition] = useTransition();
  const [roleMessage, setRoleMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [overrideMessage, setOverrideMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSaveRoleLimits = (e: React.FormEvent) => {
    e.preventDefault();
    setRoleMessage(null);

    startTransition(async () => {
      const res = await updateConsultancyRoleAiLimitsAction(
        consultancySlug,
        personalLimit,
        nutritionistLimit
      );

      if (res.success) {
        setRoleMessage({ type: "success", text: "Limites padrão por função atualizados com sucesso." });
      } else {
        setRoleMessage({ type: "error", text: res.error || "Erro ao salvar limites." });
      }
    });
  };

  const handleAddMemberOverride = (e: React.FormEvent) => {
    e.preventDefault();
    setOverrideMessage(null);

    const mId = Number(selectedMemberId);
    if (!mId) {
      setOverrideMessage({ type: "error", text: "Selecione um profissional da equipe." });
      return;
    }

    const memberObj = availableMembers.find((m) => m.membershipId === mId);
    const fullName = memberObj?.fullName || "Profissional";

    startTransition(async () => {
      const res = await updateConsultancyMemberAiOverrideAction(
        consultancySlug,
        mId,
        memberOverrideLimit,
        fullName
      );

      if (res.success) {
        setOverrideMessage({ type: "success", text: `Limite individual de ${fullName} atualizado para ${memberOverrideLimit}/dia.` });
        setMemberOverrides((prev) => {
          const filtered = prev.filter((o) => o.membershipId !== mId);
          return [
            ...filtered,
            {
              membershipId: mId,
              userFullName: fullName,
              userEmail: memberObj?.email || "",
              role: memberObj?.role || "PERSONAL",
              dailyLimit: memberOverrideLimit,
            },
          ];
        });
        setSelectedMemberId("");
      } else {
        setOverrideMessage({ type: "error", text: res.error || "Erro ao salvar exceção." });
      }
    });
  };

  const handleRemoveOverride = (membershipId: number, fullName: string) => {
    setOverrideMessage(null);

    startTransition(async () => {
      const res = await removeConsultancyMemberAiOverrideAction(
        consultancySlug,
        membershipId,
        fullName
      );

      if (res.success) {
        setOverrideMessage({ type: "success", text: `Limite individual de ${fullName} removido.` });
        setMemberOverrides((prev) => prev.filter((o) => o.membershipId !== membershipId));
      } else {
        setOverrideMessage({ type: "error", text: res.error || "Erro ao remover exceção." });
      }
    });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="border-b border-border/40 pb-5">
        <div className="flex items-center gap-2">
          <span className="text-xl">✨</span>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Configurações de Inteligência Artificial
          </h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Controle quantas importações de treinos e planos com IA os profissionais da sua consultoria podem utilizar diariamente.
        </p>
      </div>

      {/* Consultancy Quota Card */}
      <div className="bg-card/50 border border-border/50 rounded-2xl p-5 space-y-3 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-emerald-500 uppercase tracking-wider">
            Teto Diário da Consultoria
          </span>
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${
              consultancyQuota.isEnabled
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : "bg-rose-500/10 text-rose-400 border-rose-500/20"
            }`}
          >
            {consultancyQuota.isEnabled ? "Ativo" : "Desativado pela Plataforma"}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
          <div>
            <span className="text-xs text-muted-foreground">Limite Plataforma:</span>
            <div className="text-xl font-bold font-mono text-foreground mt-0.5">
              {consultancyQuota.dailyLimit} <span className="text-xs font-normal text-muted-foreground">/ dia</span>
            </div>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Utilizado Hoje:</span>
            <div className="text-xl font-bold font-mono text-foreground mt-0.5">
              {consultancyQuota.usedToday}
            </div>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Restante Hoje:</span>
            <div className="text-xl font-bold font-mono text-emerald-400 mt-0.5">
              {consultancyQuota.remainingToday}
            </div>
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground border-t border-border/30 pt-3">
          O teto diário da consultoria é o limite máximo compartilhado por todos os profissionais. Para aumentá-lo, fale com a equipe da plataforma TREVO ONE.
        </p>
      </div>

      {/* Role Defaults Card */}
      <div className="bg-card/50 border border-border/50 rounded-2xl p-5 space-y-4 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-foreground">
            Limites Padrão por Função & Recursos de IA
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Define as cotas diárias de importação com IA por perfil profissional e regras de inteligência de treino.
          </p>
        </div>

        {roleMessage && (
          <div
            className={`p-3 rounded-xl text-xs border ${
              roleMessage.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                : "bg-rose-500/10 border-rose-500/20 text-rose-400"
            }`}
          >
            {roleMessage.text}
          </div>
        )}

        <form onSubmit={handleSaveRoleLimits} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3.5 rounded-xl border border-border/40 bg-background/50 space-y-2">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <label className="block font-semibold text-foreground">
                  Importação IA — Personal
                </label>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Importação automatizada de fichas e rotinas de treino via PDF, DOCX ou texto.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={personalLimit}
                  onChange={(e) => setPersonalLimit(Number(e.target.value))}
                  className="w-24 bg-background border border-border rounded-lg px-3 py-1.5 text-sm font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                />
                <span className="text-muted-foreground text-xs">importações / dia</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-border/40 bg-background/50 space-y-2">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-teal-500" />
                <label className="block font-semibold text-foreground">
                  Importação IA — Nutricionista
                </label>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Importação de planos alimentares e cardápios com pareamento automático de alimentos.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={nutritionistLimit}
                  onChange={(e) => setNutritionistLimit(Number(e.target.value))}
                  className="w-24 bg-background border border-border rounded-lg px-3 py-1.5 text-sm font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                />
                <span className="text-muted-foreground text-xs">importações / dia</span>
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-border/40 bg-background/50 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="font-semibold text-foreground">
                  Substituição inteligente — Alunos
                </span>
              </div>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                Ativo no Runtime
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Permite que alunos em treino substituam até <strong>3 exercícios por treino</strong> por motivos operacionais (máquina ocupada ou equipamento indisponível).
              As sugestões de IA consom o teto global da consultoria. Se a cota de IA se esgotar, o aluno utiliza o motor determinístico inteligente sem interrupções.
            </p>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition shadow-xs"
          >
            {isPending ? "Salvando..." : "Salvar Limites Padrão"}
          </button>
        </form>
      </div>

      {/* Member Overrides Card */}
      <div className="bg-card/50 border border-border/50 rounded-2xl p-5 space-y-4 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-foreground">
            Exceções Individuais por Profissional
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Dê cotas personalizadas a membros específicos da sua equipe que demandem maior volume.
          </p>
        </div>

        {overrideMessage && (
          <div
            className={`p-3 rounded-xl text-xs border ${
              overrideMessage.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                : "bg-rose-500/10 border-rose-500/20 text-rose-400"
            }`}
          >
            {overrideMessage.text}
          </div>
        )}

        {/* Add Override Form */}
        <form onSubmit={handleAddMemberOverride} className="bg-muted/20 border border-border/40 p-4 rounded-xl space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="sm:col-span-2">
              <label className="block font-medium text-foreground mb-1">
                Profissional da Equipe
              </label>
              <select
                value={selectedMemberId}
                onChange={(e) => setSelectedMemberId(e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              >
                <option value="">Selecione um profissional...</option>
                {availableMembers.map((m) => (
                  <option key={m.membershipId} value={m.membershipId}>
                    {m.fullName} ({m.role === "NUTRITIONIST" ? "Nutricionista" : "Personal"}) — {m.email}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-medium text-foreground mb-1">
                Limite Diário Individual
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={memberOverrideLimit}
                  onChange={(e) => setMemberOverrideLimit(Number(e.target.value))}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                />
                <span className="text-muted-foreground shrink-0">/ dia</span>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending || !selectedMemberId}
            className="px-4 py-2 bg-muted hover:bg-muted/80 disabled:opacity-40 text-foreground rounded-lg text-xs font-medium transition"
          >
            Adicionar ou Atualizar Exceção
          </button>
        </form>

        {/* Overrides Table */}
        <div className="overflow-x-auto border border-border/30 rounded-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 border-b border-border/40 text-muted-foreground uppercase font-semibold text-[10px] tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Profissional</th>
                <th className="py-2.5 px-3">Função</th>
                <th className="py-2.5 px-3">Limite Configurado</th>
                <th className="py-2.5 px-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20">
              {memberOverrides.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-muted-foreground">
                    Nenhuma exceção individual configurada. Todos utilizam o limite padrão da função.
                  </td>
                </tr>
              ) : (
                memberOverrides.map((o) => (
                  <tr key={o.membershipId} className="hover:bg-muted/20 transition-colors">
                    <td className="py-2.5 px-3 font-medium text-foreground">
                      <div>{o.userFullName}</div>
                      <div className="text-[10px] text-muted-foreground">{o.userEmail}</div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-muted/60 text-muted-foreground border border-border/40">
                        {o.role === "NUTRITIONIST" ? "Nutricionista" : "Personal"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-foreground">
                      {o.dailyLimit} / dia
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleRemoveOverride(o.membershipId, o.userFullName)}
                        className="text-rose-400 hover:text-rose-300 font-medium text-[11px] transition"
                      >
                        Remover
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
