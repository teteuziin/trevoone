"use client";

import React, { useState, useTransition } from "react";
import { saveInfinitePaySettingsAction } from "@/app/consultoria/[slug]/financeiro/actions";
import type { InfinitePayConfig } from "@/lib/infinitepay/types";

interface InfinitePaySettingsFormProps {
  consultancySlug: string;
  config: InfinitePayConfig | null;
}

export function InfinitePaySettingsForm({ consultancySlug, config }: InfinitePaySettingsFormProps) {
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
    <div className="bg-white dark:bg-[#151619] border border-zinc-200 dark:border-[#303238] rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
      <div className="flex items-center justify-between border-b border-zinc-100 dark:border-[#303238] pb-4">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
            <h3 className="font-heading text-base font-bold text-zinc-900 dark:text-white">
              Checkout Integrado InfinitePay (CloudWalk)
            </h3>
          </div>
          <p className="text-xs text-zinc-500 dark:text-[#8E95A2]">
            Receba pagamentos de planos dos alunos por Pix ou Cartão com confirmação e ativação automática.
          </p>
        </div>

        <span
          className={`px-3 py-1 rounded-full text-xs font-bold border ${
            isEnabled
              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
              : "bg-zinc-100 text-zinc-500 border-zinc-200"
          }`}
        >
          {isEnabled ? "Integração Ativa" : "Desativada"}
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* Ativação */}
        <div className="flex items-center gap-3 p-3.5 rounded-xl bg-zinc-50 dark:bg-[#1B1D21] border border-zinc-200/80 dark:border-[#303238]">
          <input
            type="checkbox"
            name="enabled"
            id="infinitepay_enabled"
            defaultChecked={isEnabled}
            className="w-4 h-4 rounded text-[#176B49] focus:ring-[#176B49] cursor-pointer"
          />
          <label htmlFor="infinitepay_enabled" className="text-xs font-bold text-zinc-900 dark:text-white cursor-pointer select-none">
            Habilitar Checkout InfinitePay para cobranças de planos
          </label>
        </div>

        {/* Handle / InfiniteTag */}
        <div className="space-y-1">
          <label className="font-bold text-zinc-900 dark:text-white block">
            InfiniteTag (Handle da Consultoria) <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-400 font-mono text-sm">
              $
            </span>
            <input
              type="text"
              name="handle"
              required
              defaultValue={currentHandle}
              placeholder="suatag"
              className="w-full h-10 pl-7 pr-3 rounded-xl border border-zinc-200 dark:border-[#303238] dark:bg-[#1B1D21] dark:text-white focus:outline-none focus:border-[#176B49] text-sm font-mono"
            />
          </div>
          <p className="text-[11px] text-zinc-500 dark:text-[#8E95A2]">
            Sua InfiniteTag cadastrada no aplicativo da InfinitePay (informe sem o caractere $).
          </p>
        </div>

        {/* Ambiente */}
        <div className="space-y-1">
          <label className="font-bold text-zinc-900 dark:text-white block">
            Ambiente Operacional
          </label>
          <select
            name="environment"
            defaultValue={currentEnv}
            className="w-full h-10 px-3 rounded-xl border border-zinc-200 dark:border-[#303238] dark:bg-[#1B1D21] dark:text-white focus:outline-none focus:border-[#176B49] text-xs"
          >
            <option value="SIMULATION">
              Simulação (Testes seguros com link simulado sem cobrança bancária real)
            </option>
            <option value="PRODUCTION">
              Produção Oficial CloudWalk (Links e transações reais da InfinitePay)
            </option>
          </select>
          <p className="text-[11px] text-zinc-500 dark:text-[#8E95A2]">
            O Checkout Integrado da InfinitePay não possui sandbox bancário. Use &ldquo;Simulação&rdquo; para validar os fluxos com segurança.
          </p>
        </div>

        {/* Chave de API Secreta */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="font-bold text-zinc-900 dark:text-white block">
              Chave de API Secreta (X-Api-Key)
            </label>
            <span className="text-[11px] text-[#5A6660]">
              Status no servidor:{" "}
              {hasApiKeyConfigured ? (
                <strong className="text-emerald-700 dark:text-emerald-400">Configurada (••••••••)</strong>
              ) : (
                <strong className="text-amber-600">Pendente</strong>
              )}
            </span>
          </div>
          <input
            type="password"
            name="apiKey"
            placeholder={hasApiKeyConfigured ? "Chave protegida no servidor (preencha somente para alterar)" : "inchk_..."}
            className="w-full h-10 px-3 rounded-xl border border-zinc-200 dark:border-[#303238] dark:bg-[#1B1D21] dark:text-white focus:outline-none focus:border-[#176B49] text-sm font-mono"
          />
          <p className="text-[11px] text-zinc-500 dark:text-[#8E95A2]">
            Gerada no painel ou aplicativo da InfinitePay. Armazenada estritamente no backend com acesso protegido.
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

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-[#176B49] hover:bg-[#125438] disabled:opacity-50 transition-all min-h-[42px] shadow-xs cursor-pointer"
          >
            {isPending ? "Salvando configurações..." : "Salvar Configurações InfinitePay"}
          </button>
        </div>
      </form>
    </div>
  );
}
