"use client";

import React, { useState, useTransition } from "react";
import {
  updateConsultancyRoleAiLimitsAction,
  updateConsultancyMemberAiOverrideAction,
  removeConsultancyMemberAiOverrideAction,
} from "@/app/consultoria/[slug]/configuracoes/ia/actions";
import { AdminExecutiveHeader } from "@/components/admin/admin-executive-header";
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
    <div className="space-y-6">
      {/* Executive Header */}
      <AdminExecutiveHeader
        eyebrow="● ADMINISTRAÇÃO · IA & AUTOMAÇÃO"
        title="IA e cotas"
        subtitle="Gerencie os limites diários de importação de arquivos e recursos inteligentes da consultoria."
        backHref={`/consultoria/${consultancySlug}`}
        backLabel="Voltar ao Painel"
        badge={consultancyQuota.isEnabled ? "Cota Ativa" : "Pausada"}
        badgeVariant={consultancyQuota.isEnabled ? "success" : "neutral"}
      />

      {/* Consultancy Quota Card */}
      <div className="bg-white dark:bg-[#151619] border border-zinc-200 dark:border-[#303238] rounded-2xl p-5 sm:p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
            Teto Diário da Consultoria
          </span>
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
              consultancyQuota.isEnabled
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                : "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20"
            }`}
          >
            {consultancyQuota.isEnabled ? "Cota Ativa" : "Desativado pela Plataforma"}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
          <div className="p-4 rounded-xl bg-zinc-50 dark:bg-[#1B1D21] border border-zinc-200/80 dark:border-[#303238] space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-[#8E95A2] block">
              Limite Plataforma
            </span>
            <div className="text-2xl font-bold font-mono text-zinc-900 dark:text-white">
              {consultancyQuota.dailyLimit} <span className="text-xs font-normal text-zinc-500 dark:text-[#8E95A2]">/ dia</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-zinc-50 dark:bg-[#1B1D21] border border-zinc-200/80 dark:border-[#303238] space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-[#8E95A2] block">
              Utilizado Hoje
            </span>
            <div className="text-2xl font-bold font-mono text-zinc-900 dark:text-white">
              {consultancyQuota.usedToday}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-zinc-50 dark:bg-[#1B1D21] border border-zinc-200/80 dark:border-[#303238] space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-[#8E95A2] block">
              Restante Hoje
            </span>
            <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {consultancyQuota.remainingToday}
            </div>
          </div>
        </div>

        <p className="text-[11px] text-zinc-500 dark:text-[#8E95A2] border-t border-zinc-100 dark:border-[#303238] pt-3">
          O teto diário da consultoria é o limite máximo compartilhado por todos os profissionais. Para aumentá-lo, fale com a equipe da plataforma TREVO ONE.
        </p>
      </div>

      {/* Role Defaults Card */}
      <div className="bg-white dark:bg-[#151619] border border-zinc-200 dark:border-[#303238] rounded-2xl p-5 sm:p-6 space-y-4 shadow-sm">
        <div>
          <h2 className="text-base font-bold text-zinc-900 dark:text-white">
            Limites Padrão por Função & Recursos de IA
          </h2>
          <p className="text-xs text-zinc-500 dark:text-[#8E95A2] mt-0.5">
            Define as cotas diárias de importação com IA por perfil profissional e regras de inteligência de treino.
          </p>
        </div>

        {roleMessage && (
          <div
            className={`p-3 rounded-xl text-xs border ${
              roleMessage.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                : "bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-400"
            }`}
          >
            {roleMessage.text}
          </div>
        )}

        <form onSubmit={handleSaveRoleLimits} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-zinc-200 dark:border-[#303238] bg-zinc-50 dark:bg-[#1B1D21] space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <label className="block font-bold text-zinc-900 dark:text-white text-xs">
                  Importação IA — Personal
                </label>
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-[#8E95A2]">
                Importação automatizada de fichas e rotinas de treino via PDF, DOCX ou texto.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={personalLimit}
                  onChange={(e) => setPersonalLimit(Number(e.target.value))}
                  className="w-24 bg-white dark:bg-[#151619] border border-zinc-200 dark:border-[#303238] rounded-xl px-3 py-2 text-sm font-mono text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[40px]"
                />
                <span className="text-zinc-500 dark:text-[#8E95A2] text-xs">importações / dia</span>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-zinc-200 dark:border-[#303238] bg-zinc-50 dark:bg-[#1B1D21] space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-500" />
                <label className="block font-bold text-zinc-900 dark:text-white text-xs">
                  Importação IA — Nutricionista
                </label>
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-[#8E95A2]">
                Importação de planos alimentares e cardápios com pareamento automático de alimentos.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={nutritionistLimit}
                  onChange={(e) => setNutritionistLimit(Number(e.target.value))}
                  className="w-24 bg-white dark:bg-[#151619] border border-zinc-200 dark:border-[#303238] rounded-xl px-3 py-2 text-sm font-mono text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[40px]"
                />
                <span className="text-zinc-500 dark:text-[#8E95A2] text-xs">importações / dia</span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-zinc-200 dark:border-[#303238] bg-zinc-50 dark:bg-[#1B1D21] space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span className="font-bold text-zinc-900 dark:text-white text-xs">
                  Substituição inteligente — Alunos
                </span>
              </div>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20">
                Ativo no Runtime
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-[#8E95A2] leading-relaxed">
              Permite que alunos em treino substituam até <strong>3 exercícios por treino</strong> por motivos operacionais (máquina ocupada ou equipamento indisponível).
              As sugestões de IA consom o teto global da consultoria. Se a cota de IA se esgotar, o aluno utiliza o motor determinístico inteligente sem interrupções.
            </p>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-sm min-h-[44px] cursor-pointer"
          >
            {isPending ? "Salvando..." : "Salvar Limites Padrão"}
          </button>
        </form>
      </div>

      {/* Member Overrides Card */}
      <div className="bg-white dark:bg-[#151619] border border-zinc-200 dark:border-[#303238] rounded-2xl p-5 sm:p-6 space-y-4 shadow-sm">
        <div>
          <h2 className="text-base font-bold text-zinc-900 dark:text-white">
            Exceções Individuais por Profissional
          </h2>
          <p className="text-xs text-zinc-500 dark:text-[#8E95A2] mt-0.5">
            Dê cotas personalizadas a membros específicos da sua equipe que demandem maior volume.
          </p>
        </div>

        {overrideMessage && (
          <div
            className={`p-3 rounded-xl text-xs border ${
              overrideMessage.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                : "bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-400"
            }`}
          >
            {overrideMessage.text}
          </div>
        )}

        {/* Add Override Form */}
        <form onSubmit={handleAddMemberOverride} className="bg-zinc-50 dark:bg-[#1B1D21] border border-zinc-200 dark:border-[#303238] p-4 rounded-xl space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="sm:col-span-2 space-y-1">
              <label className="block font-semibold text-zinc-700 dark:text-zinc-300">
                Profissional da Equipe
              </label>
              <select
                value={selectedMemberId}
                onChange={(e) => setSelectedMemberId(e.target.value)}
                className="w-full bg-white dark:bg-[#151619] border border-zinc-200 dark:border-[#303238] rounded-xl px-3 py-2.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
              >
                <option value="">Selecione um profissional...</option>
                {availableMembers.map((m) => (
                  <option key={m.membershipId} value={m.membershipId}>
                    {m.fullName} ({m.role === "NUTRITIONIST" ? "Nutricionista" : "Personal"}) — {m.email}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block font-semibold text-zinc-700 dark:text-zinc-300">
                Limite Diário Individual
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={memberOverrideLimit}
                  onChange={(e) => setMemberOverrideLimit(Number(e.target.value))}
                  className="w-full bg-white dark:bg-[#151619] border border-zinc-200 dark:border-[#303238] rounded-xl px-3 py-2 text-xs font-mono text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
                />
                <span className="text-zinc-500 dark:text-[#8E95A2] shrink-0 text-xs">/ dia</span>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending || !selectedMemberId}
            className="px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 disabled:opacity-40 text-white dark:text-zinc-900 rounded-xl text-xs font-bold transition min-h-[44px] cursor-pointer"
          >
            Adicionar ou Atualizar Exceção
          </button>
        </form>

        {/* Overrides Table */}
        <div className="overflow-x-auto border border-zinc-200 dark:border-[#303238] rounded-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 dark:bg-[#1B1D21] border-b border-zinc-200 dark:border-[#303238] text-zinc-500 dark:text-[#8E95A2] uppercase font-semibold text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Profissional</th>
                <th className="py-3 px-4">Função</th>
                <th className="py-3 px-4">Limite Configurado</th>
                <th className="py-3 px-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-[#303238]">
              {memberOverrides.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-zinc-500 dark:text-[#8E95A2]">
                    Nenhuma exceção individual configurada. Todos utilizam o limite padrão da função.
                  </td>
                </tr>
              ) : (
                memberOverrides.map((o) => (
                  <tr key={o.membershipId} className="hover:bg-zinc-50/50 dark:hover:bg-[#1B1D21]/50 transition-colors">
                    <td className="py-3 px-4 font-medium text-zinc-900 dark:text-white">
                      <div>{o.userFullName}</div>
                      <div className="text-[10px] text-zinc-500 dark:text-[#8E95A2]">{o.userEmail}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-100 dark:bg-[#1B1D21] text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-[#303238]">
                        {o.role === "NUTRITIONIST" ? "Nutricionista" : "Personal"}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-zinc-900 dark:text-white">
                      {o.dailyLimit} / dia
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleRemoveOverride(o.membershipId, o.userFullName)}
                        className="text-rose-600 dark:text-rose-400 hover:underline font-semibold text-xs transition cursor-pointer"
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
