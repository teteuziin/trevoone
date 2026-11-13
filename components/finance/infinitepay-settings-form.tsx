"use client";

import React, { useState, useTransition } from "react";
import { saveInfinitePaySettingsAction } from "@/app/consultoria/[slug]/financeiro/actions";
import type { InfinitePayConfig } from "@/lib/infinitepay/types";

interface InfinitePaySettingsFormProps {
  consultancySlug: string;
  config: InfinitePayConfig | null;
  canEditSettings?: boolean;
}

export function InfinitePaySettingsForm({
  consultancySlug,
  config,
  canEditSettings = true,
}: InfinitePaySettingsFormProps) {
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const hasApiKeyConfigured = Boolean(config?.apiKey);
  const isEnabled = Boolean(config?.enabled);
  const currentHandle = config?.handle || "";
  const currentEnv = config?.environment || "SIMULATION";

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const form = e.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      try {
        const res = await saveInfinitePaySettingsAction(consultancySlug, null, formData);
        if (res.success) {
          setSuccessMessage(res.message || "Configurações da InfinitePay salvas com sucesso!");
          setTimeout(() => {
            window.location.reload();
          }, 1200);
        } else {
          setErrorMessage(res.error || "Não foi possível salvar as configurações.");
        }
      } catch {
        setErrorMessage("Erro de conexão ao salvar configurações.");
      }
    });
  };

  return (
    <div className="space-y-5">
      {/* Simulation Warning Banner (compacto) */}
      {currentEnv === "SIMULATION" && (
        <div className="px-3.5 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-950 flex items-center justify-between gap-2.5 text-xs shadow-2xs">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0 animate-pulse" />
            <p className="font-semibold text-[11px] sm:text-xs text-amber-950 break-words">
              Modo de simulação — pagamentos reais desativados.
            </p>
          </div>
          <span className="shrink-0 text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-950 border border-amber-500/30">
            Simulação
          </span>
        </div>
      )}

      {/* Explicação de como funciona o recebimento */}
      <div className="bg-white border border-[#E5E8E2] rounded-2xl p-5 shadow-xs space-y-3">
        <h3 className="font-heading text-sm font-bold text-zinc-900 flex items-center gap-2">
          <svg className="w-4 h-4 text-[#176B49]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
          </svg>
          <span>Como funciona o recebimento automático</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/70 space-y-1.5 min-w-0">
            <span className="w-5 h-5 rounded-full bg-emerald-500/10 text-[#176B49] font-bold text-[11px] flex items-center justify-center">
              1
            </span>
            <p className="font-bold text-zinc-900 break-words">Envio do link</p>
            <p className="text-[11px] text-zinc-500 leading-relaxed break-words">
              Você emite a cobrança ou envia o link do plano para o aluno por WhatsApp ou chat.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/70 space-y-1.5 min-w-0">
            <span className="w-5 h-5 rounded-full bg-emerald-500/10 text-[#176B49] font-bold text-[11px] flex items-center justify-center">
              2
            </span>
            <p className="font-bold text-zinc-900 break-words">Pagamento seguro</p>
            <p className="text-[11px] text-zinc-500 leading-relaxed break-words">
              O aluno paga por Pix imediato ou parcela no cartão pelo checkout da InfinitePay.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/70 space-y-1.5 min-w-0">
            <span className="w-5 h-5 rounded-full bg-emerald-500/10 text-[#176B49] font-bold text-[11px] flex items-center justify-center">
              3
            </span>
            <p className="font-bold text-zinc-900 break-words">Liberação na hora</p>
            <p className="text-[11px] text-zinc-500 leading-relaxed break-words">
              O pagamento é confirmado e o acesso aos treinos e planos é liberado automaticamente.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/70 space-y-1.5 min-w-0">
            <span className="w-5 h-5 rounded-full bg-emerald-500/10 text-[#176B49] font-bold text-[11px] flex items-center justify-center">
              4
            </span>
            <p className="font-bold text-zinc-900 break-words">Direto na sua conta</p>
            <p className="text-[11px] text-zinc-500 leading-relaxed break-words">
              O valor cai diretamente na sua conta da InfinitePay vinculada à sua InfiniteTag.
            </p>
          </div>
        </div>
      </div>

      {/* Main Form Card */}
      <div className="bg-white border border-[#E5E8E2] rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5E8E2] pb-4">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${isEnabled ? "bg-emerald-500" : "bg-zinc-400"}`} />
              <h3 className="font-heading text-base font-bold text-zinc-900">
                Conta InfinitePay da Consultoria
              </h3>
            </div>
            <p className="text-xs text-zinc-500">
              Configure sua InfiniteTag e credenciais para o recebimento automático.
            </p>
          </div>

          <span
            className={`px-3 py-1 rounded-full text-xs font-bold border self-start sm:self-auto ${
              isEnabled
                ? currentEnv === "SIMULATION"
                  ? "bg-amber-500/10 text-amber-700 border-amber-500/20"
                  : "bg-emerald-500/10 text-emerald-700 border-emerald-500/20"
                : "bg-zinc-100 text-zinc-500 border-zinc-200"
            }`}
          >
            {isEnabled ? (currentEnv === "SIMULATION" ? "Simulação Ativa" : "Recebimento Ativo") : "Desativado"}
          </span>
        </div>

        {!canEditSettings && (
          <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-900 text-xs flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
            <span>Visualização informativa. Apenas administradores da consultoria podem alterar a InfiniteTag e credenciais de recebimento.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Ativação */}
          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/80">
            <input
              type="checkbox"
              name="enabled"
              id="infinitepay_enabled"
              disabled={!canEditSettings}
              defaultChecked={isEnabled}
              className="w-4 h-4 rounded text-[#176B49] focus:ring-[#176B49] cursor-pointer disabled:opacity-50"
            />
            <label htmlFor="infinitepay_enabled" className="text-xs font-bold text-zinc-900 cursor-pointer select-none">
              Habilitar recebimentos automáticos via InfinitePay
            </label>
          </div>

          {/* Handle / InfiniteTag */}
          <div className="space-y-1">
            <label className="font-bold text-zinc-900 block">
              InfiniteTag da Consultoria <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-400 font-mono text-sm">
                $
              </span>
              <input
                type="text"
                name="handle"
                required
                disabled={!canEditSettings}
                defaultValue={currentHandle}
                placeholder="suatag"
                className="w-full h-11 pl-7 pr-3 rounded-xl border border-zinc-300 bg-white text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-[#176B49] text-sm font-mono disabled:opacity-60"
              />
            </div>
            <p className="text-[11px] text-zinc-500">
              Sua tag cadastrada no app InfinitePay (digite sem o caractere $).
            </p>
          </div>

          {/* Chave de API Secreta */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="font-bold text-zinc-900 block">
                Chave de API Secreta (X-Api-Key)
              </label>
              <span className="text-[11px] text-[#5A6660]">
                Status:{" "}
                {hasApiKeyConfigured ? (
                  <strong className="text-emerald-700">Protegida no servidor (••••••••)</strong>
                ) : (
                  <strong className="text-amber-600">Pendente</strong>
                )}
              </span>
            </div>
            <input
              type="password"
              name="apiKey"
              disabled={!canEditSettings}
              placeholder={hasApiKeyConfigured ? "Chave protegida no servidor (preencha somente para alterar)" : "inchk_..."}
              className="w-full h-11 px-3 rounded-xl border border-zinc-300 bg-white text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-[#176B49] text-sm font-mono disabled:opacity-60"
            />
            <p className="text-[11px] text-zinc-500">
              Gerada no painel da InfinitePay. Armazenada de forma protegida no servidor e nunca exposta publicamente.
            </p>
          </div>

          {/* Ambiente Operacional */}
          <div className="space-y-1">
            <label className="font-bold text-zinc-900 block">
              Ambiente Operacional
            </label>
            <select
              name="environment"
              disabled={!canEditSettings}
              defaultValue={currentEnv}
              className="w-full h-11 px-3 rounded-xl border border-zinc-300 bg-white text-zinc-900 focus:outline-none focus:border-[#176B49] text-xs disabled:opacity-60"
            >
              <option value="SIMULATION">
                Modo de simulação (recomendado para testes sem transações bancárias reais)
              </option>
              <option value="PRODUCTION">
                Modo de produção (cobranças e transações reais da InfinitePay)
              </option>
            </select>
            <p className="text-[11px] text-zinc-500">
              Mantenha em &ldquo;Modo de simulação&rdquo; para validar o fluxo sem envolver dinheiro real.
            </p>
          </div>

          {errorMessage && (
            <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 p-2.5 rounded-xl font-medium">
              {errorMessage}
            </p>
          )}

          {successMessage && (
            <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl font-medium">
              {successMessage}
            </p>
          )}

          {canEditSettings && (
            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={isPending}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-[#176B49] hover:bg-[#125438] disabled:opacity-50 transition-all min-h-[44px] shadow-xs cursor-pointer select-none"
              >
                {isPending ? "Salvando configurações..." : "Salvar Configurações de Recebimento"}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
