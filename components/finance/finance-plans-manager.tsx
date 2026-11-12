"use client";

import React, { useState, useTransition } from "react";
import { createConsultancyPlanAction } from "@/app/consultoria/[slug]/financeiro/actions";
import type { ConsultancyPlan } from "@/lib/infinitepay/types";

interface FinancePlansManagerProps {
  consultancySlug: string;
  initialPlans: ConsultancyPlan[];
}

export function FinancePlansManager({ consultancySlug, initialPlans }: FinancePlansManagerProps) {
  const [plans] = useState<ConsultancyPlan[]>(initialPlans);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const formatBrl = (cents: number) =>
    (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const handleCreatePlan = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const form = e.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      try {
        const res = await createConsultancyPlanAction(consultancySlug, null, formData);
        if (res.success) {
          setSuccessMessage(res.message || "Plano criado com sucesso!");
          setTimeout(() => {
            setIsModalOpen(false);
            window.location.reload();
          }, 1000);
        } else {
          setErrorMessage(res.error || "Não foi possível criar o plano.");
        }
      } catch {
        setErrorMessage("Erro ao salvar plano.");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#151619] border border-zinc-200 dark:border-[#303238] shadow-xs">
        <div>
          <h2 className="font-heading text-base font-bold text-zinc-900 dark:text-white">
            Planos Comerciais da Consultoria
          </h2>
          <p className="text-xs text-zinc-500 dark:text-[#8E95A2]">
            Cadastre os planos esportivos disponíveis para contratação com cobrança e ativação automática via InfinitePay.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-[#176B49] hover:bg-[#125438] transition-colors min-h-[42px] shadow-xs cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          <span>+ Novo Plano</span>
        </button>
      </div>

      {/* Plans List */}
      {plans.length === 0 ? (
        <div className="p-8 sm:p-12 rounded-2xl bg-white dark:bg-[#151619] border border-zinc-200 dark:border-[#303238] text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-[#176B49] flex items-center justify-center mx-auto">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
            </svg>
          </div>
          <h3 className="font-heading text-base font-bold text-zinc-900 dark:text-white">
            Nenhum plano cadastrado
          </h3>
          <p className="text-xs text-zinc-500 dark:text-[#8E95A2] max-w-sm mx-auto">
            Cadastre planos como Mensal, Trimestral ou Semestral para permitir que seus alunos contratem e paguem diretamente pelo app.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map((p) => {
            const durationText = p.durationMonths
              ? `${p.durationMonths} ${p.durationMonths === 1 ? "mês" : "meses"}`
              : p.durationDays
              ? `${p.durationDays} dias`
              : "Mensal";

            return (
              <div
                key={p.publicId}
                className="bg-white dark:bg-[#151619] border border-zinc-200 dark:border-[#303238] rounded-2xl p-5 shadow-xs space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-[#176B49] bg-[#E8F0EA] px-2 py-0.5 rounded-full border border-[#CDEED5]">
                      {durationText}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        p.status === "ACTIVE"
                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                          : "bg-zinc-100 text-zinc-500 border-zinc-200"
                      }`}
                    >
                      {p.status === "ACTIVE" ? "Ativo" : "Inativo"}
                    </span>
                  </div>

                  <h3 className="font-heading text-lg font-bold text-zinc-900 dark:text-white">
                    {p.name}
                  </h3>

                  {p.description && (
                    <p className="text-xs text-zinc-500 dark:text-[#8E95A2] line-clamp-2">
                      {p.description}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-zinc-100 dark:border-[#303238] space-y-1.5">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-zinc-500 dark:text-[#8E95A2]">Valor Total:</span>
                    <strong className="text-xl font-black text-zinc-900 dark:text-white tabular-nums">
                      {formatBrl(p.amountCents)}
                    </strong>
                  </div>

                  <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-[#8E95A2]">
                    <span>Parcelamento:</span>
                    <span className="font-medium text-zinc-700 dark:text-zinc-300">
                      {p.assuredInstallments > 0
                        ? `Até ${p.assuredInstallments}x sem juros`
                        : "Taxas do comprador"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-[#8E95A2]">
                    <span>Formas aceitas:</span>
                    <span className="font-medium text-zinc-700 dark:text-zinc-300">
                      Pix e Cartão
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: New Plan */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl border border-[#E5E8E2] space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#E5E8E2] pb-3.5">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#176B49] bg-[#E8F0EA] px-2.5 py-0.5 rounded-full border border-[#CDEED5]">
                  Novo Plano Comercial
                </span>
                <h2 className="font-heading text-lg font-bold text-[#102E23]">
                  Cadastrar Plano da Consultoria
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-[#FAF9F6] text-[#5A6660] hover:text-[#102E23] flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePlan} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-[#102E23] block">
                  Nome do Plano <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="Ex: Consultoria Semestral VIP"
                  className="w-full h-10 px-3 rounded-xl border border-[#E5E8E2] focus:outline-none focus:border-[#176B49] text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[#102E23] block">
                  Descrição (opcional)
                </label>
                <textarea
                  name="description"
                  rows={2}
                  placeholder="Ex: Acompanhamento de treino + dieta com suporte semanal"
                  className="w-full p-2.5 rounded-xl border border-[#E5E8E2] focus:outline-none focus:border-[#176B49] text-xs resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-[#102E23] block">
                    Valor Total (R$) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="amountBrl"
                    required
                    placeholder="900,00"
                    className="w-full h-10 px-3 rounded-xl border border-[#E5E8E2] focus:outline-none focus:border-[#176B49] text-sm font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[#102E23] block">
                    Duração em Meses
                  </label>
                  <input
                    type="number"
                    name="durationMonths"
                    min="1"
                    max="60"
                    defaultValue="6"
                    className="w-full h-10 px-3 rounded-xl border border-[#E5E8E2] focus:outline-none focus:border-[#176B49] text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[#102E23] block">
                  Política de Taxas do Parcelamento (Cartão)
                </label>
                <select
                  name="assuredInstallments"
                  defaultValue="0"
                  className="w-full h-10 px-3 rounded-xl border border-[#E5E8E2] focus:outline-none focus:border-[#176B49] text-xs bg-white"
                >
                  <option value="0">Cliente assume todas as taxas de parcelamento</option>
                  <option value="2">Consultoria assume taxas até 2x (sem juros para o aluno)</option>
                  <option value="3">Consultoria assume taxas até 3x (sem juros para o aluno)</option>
                  <option value="6">Consultoria assume taxas até 6x (sem juros para o aluno)</option>
                  <option value="10">Consultoria assume taxas até 10x (sem juros para o aluno)</option>
                  <option value="12">Consultoria assume taxas até 12x (sem juros para o aluno)</option>
                </select>
                <p className="text-[11px] text-[#5A6660]">
                  Conforme a documentação oficial da InfinitePay, o campo <code>assured_installments</code> define até quantas parcelas têm taxas absorvidas pela consultoria.
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

              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-[#E5E8E2]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isPending}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-[#5A6660] hover:text-[#102E23] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#176B49] hover:bg-[#125438] disabled:opacity-50 transition-all min-h-[42px] shadow-xs cursor-pointer"
                >
                  {isPending ? "Cadastrando plano..." : "Cadastrar Plano"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
