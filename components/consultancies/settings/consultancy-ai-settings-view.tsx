"use client";

import React, { useState, useTransition } from "react";
import {
  updateConsultancyRoleAiLimitsAction,
  updateConsultancyMemberAiOverrideAction,
  removeConsultancyMemberAiOverrideAction,
} from "@/app/consultoria/[slug]/configuracoes/ia/actions";
import { getDestinyAiModelStatusAction } from "@/app/consultoria/[slug]/rotinas/ai-actions";
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

interface DestinyModelItem {
  id: string;
  displayName: string;
  role: "PRIMARY" | "BACKUP_1" | "BACKUP_2" | "RESERVE";
  priority: number;
  remaining: string;
  remainingFraction: number;
  resetTime: string | null;
  status: "AVAILABLE" | "COOLDOWN" | "EXHAUSTED";
  consecutiveFailures: number;
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
  initialDestinyStatus?: {
    isConfigured: boolean;
    models: DestinyModelItem[];
    totalRequestsToday?: number;
    totalRequestsMonth?: number;
  } | null;
}

export function ConsultancyAiSettingsView({
  consultancySlug,
  consultancyQuota,
  initialRoleLimits,
  initialMemberOverrides,
  availableMembers,
  initialDestinyStatus,
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

  // Destiny AI Live Status State (pre-populated by server component, refreshable on click)
  const [destinyData, setDestinyData] = useState<{
    isConfigured: boolean;
    models: DestinyModelItem[];
    totalRequestsToday?: number;
    totalRequestsMonth?: number;
  } | null>(initialDestinyStatus ?? null);
  const [loadingDestiny, setLoadingDestiny] = useState(false);

  const fetchDestinyStatus = async () => {
    setLoadingDestiny(true);
    try {
      const res = await getDestinyAiModelStatusAction(consultancySlug);
      if (res.success) {
        setDestinyData({
          isConfigured: res.isConfigured,
          models: (res.models as DestinyModelItem[]) || [],
          totalRequestsToday: res.totalRequestsToday,
          totalRequestsMonth: res.totalRequestsMonth,
        });
      }
    } catch (err) {
      console.error("[ConsultancyAiSettingsView] Erro ao carregar status Destiny AI:", err);
    } finally {
      setLoadingDestiny(false);
    }
  };

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

      {/* Destiny AI Models & Quotas Card */}
      <div className="bg-white dark:bg-[#151619] border border-zinc-200 dark:border-[#303238] rounded-2xl p-5 sm:p-6 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                Modelos de IA & Alternância Automática (Destiny AI)
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                Fase 1: Personal & Treinos
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-[#8E95A2] mt-0.5">
              Ordem de prioridade, disponibilidade oficial no gateway e métricas de consumo para geração e auxílio no Builder 4.0.
            </p>
          </div>

          <button
            type="button"
            disabled={loadingDestiny}
            onClick={fetchDestinyStatus}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 dark:bg-[#1E2024] dark:hover:bg-[#282A30] text-zinc-700 dark:text-zinc-200 transition-colors cursor-pointer self-start sm:self-auto"
          >
            <span>🔄</span>
            <span>{loadingDestiny ? "Atualizando..." : "Atualizar Status"}</span>
          </button>
        </div>

        {/* Global/API Level Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-[#1B1D21] border border-zinc-200/80 dark:border-[#303238]">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-[#8E95A2] block">
              Gateway & Chave
            </span>
            <div className="text-sm font-bold text-zinc-900 dark:text-white mt-1 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Destiny AI (Plano Pro)
            </div>
            <span className="text-[10px] text-zinc-400 dark:text-[#8E95A2] block mt-0.5">
              OpenAI Compatible • Backend seguro
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-[#1B1D21] border border-zinc-200/80 dark:border-[#303238]">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-[#8E95A2] block">
              Requisições Registradas (Hoje)
            </span>
            <div className="text-lg font-bold font-mono text-zinc-900 dark:text-white mt-1">
              {destinyData?.totalRequestsToday ?? 0}
            </div>
            <span className="text-[10px] text-zinc-400 dark:text-[#8E95A2] block mt-0.5">
              Consumo registrado no provedor
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-[#1B1D21] border border-zinc-200/80 dark:border-[#303238]">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-[#8E95A2] block">
              Requisições no Mês
            </span>
            <div className="text-lg font-bold font-mono text-zinc-900 dark:text-white mt-1">
              {destinyData?.totalRequestsMonth ?? 0}
            </div>
            <span className="text-[10px] text-zinc-400 dark:text-[#8E95A2] block mt-0.5">
              Acumulado na conta Destiny AI
            </span>
          </div>
        </div>

        {/* Approved Models Table */}
        <div className="overflow-x-auto border border-zinc-200 dark:border-[#303238] rounded-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 dark:bg-[#1B1D21] border-b border-zinc-200 dark:border-[#303238] text-zinc-500 dark:text-[#8E95A2]">
              <tr>
                <th className="py-2.5 px-3">Prioridade / Modelo</th>
                <th className="py-2.5 px-3">Papel no Sistema</th>
                <th className="py-2.5 px-3">Cota Oficial Provedor</th>
                <th className="py-2.5 px-3">Status Operacional</th>
                <th className="py-2.5 px-3">Renovação Prevista</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-[#303238]">
              {destinyData?.models && destinyData.models.length > 0 ? (
                destinyData.models.map((m) => (
                  <tr key={m.id} className="hover:bg-zinc-50/50 dark:hover:bg-[#1B1D21]/50">
                    <td className="py-3 px-3">
                      <div className="font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-mono text-[11px] flex items-center justify-center font-bold">
                          {m.priority}
                        </span>
                        <span>{m.displayName}</span>
                      </div>
                      <span className="text-[10px] text-zinc-400 font-mono ml-7 block">{m.id}</span>
                    </td>
                    <td className="py-3 px-3">
                      {m.role === "PRIMARY" ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                          Principal
                        </span>
                      ) : m.role === "BACKUP_1" ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-500/20">
                          Reserva 1
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                          Reserva 2
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-mono font-bold text-zinc-900 dark:text-white">
                        {m.remaining}
                      </div>
                      <span className="text-[10px] text-zinc-400">
                        ({Math.round(m.remainingFraction * 100)}% disponível)
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      {m.status === "AVAILABLE" ? (
                        <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Disponível
                        </span>
                      ) : m.status === "COOLDOWN" ? (
                        <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          Cooldown ({m.consecutiveFailures} falhas)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                          Esgotado
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 font-mono text-zinc-600 dark:text-zinc-300">
                      {m.resetTime ? new Date(m.resetTime).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "—"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-zinc-500">
                    {loadingDestiny ? "Carregando modelos aprovados..." : "Destiny AI não configurada ou sem conexão."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="text-[11px] text-zinc-500 dark:text-[#8E95A2] border-t border-zinc-100 dark:border-[#303238] pt-3">
          <strong>Regra de Contingência Autônoma:</strong> Caso o modelo principal (gemini-2.5-flash) atinja cota esgotada (429/400 RESOURCE_EXHAUSTED) ou instabilidade temporária (500/503), o backend comuta automaticamente para o Reserva 1 (gemini-3-flash) e subsequentemente para o Reserva 2 (gemini-2.5-flash-lite), sem interromper a tela do Personal.
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
