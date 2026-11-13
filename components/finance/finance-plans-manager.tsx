"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  createConsultancyPlanAction,
  toggleConsultancyPlanStatusAction,
  searchStudentsAction,
  createStudentPlanChargeAction,
} from "@/app/consultoria/[slug]/financeiro/actions";
import type { ConsultancyPlan } from "@/lib/infinitepay/types";
import type { StudentSearchItem } from "@/lib/consultancies/finance";

interface FinancePlansManagerProps {
  consultancySlug: string;
  initialPlans: ConsultancyPlan[];
  canManagePlans?: boolean;
}

export function FinancePlansManager({
  consultancySlug,
  initialPlans,
  canManagePlans = true,
}: FinancePlansManagerProps) {
  const [plans, setPlans] = useState<ConsultancyPlan[]>(initialPlans);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Quick Charge Modal state
  const [chargingPlan, setChargingPlan] = useState<ConsultancyPlan | null>(null);
  const [studentSearchQuery, setStudentSearchQuery] = useState("");
  const [studentSearchResults, setStudentSearchResults] = useState<StudentSearchItem[]>([]);
  const [isSearchingStudent, setIsSearchingStudent] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentSearchItem | null>(null);
  const [isGeneratingCharge, startGeneratingCharge] = useTransition();
  const [chargeError, setChargeError] = useState<string | null>(null);
  const [chargeSuccess, setChargeSuccess] = useState<{
    chargePublicId: string;
    checkoutUrl?: string;
    whatsAppHref?: string;
  } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Plan status toggle state
  const [togglingPlanId, setTogglingPlanId] = useState<string | null>(null);

  const formatBrl = (cents: number) =>
    (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  // Debounced search for students inside Charge Modal
  useEffect(() => {
    const trimmed = studentSearchQuery.trim();
    if (trimmed.length < 2 || selectedStudent) {
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingStudent(true);
      try {
        const results = await searchStudentsAction(consultancySlug, trimmed);
        setStudentSearchResults(results);
      } catch {
        setStudentSearchResults([]);
      } finally {
        setIsSearchingStudent(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [studentSearchQuery, selectedStudent, consultancySlug]);

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
            setIsCreateModalOpen(false);
            window.location.reload();
          }, 1000);
        } else {
          setErrorMessage(res.error || "Não foi possível criar o plano.");
        }
      } catch {
        setErrorMessage("Erro ao salvar o plano. Verifique os dados e tente novamente.");
      }
    });
  };

  const handleToggleStatus = (plan: ConsultancyPlan) => {
    const newStatus = plan.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    setTogglingPlanId(plan.publicId);
    setErrorMessage(null);

    startTransition(async () => {
      try {
        const res = await toggleConsultancyPlanStatusAction(consultancySlug, plan.publicId, newStatus);
        if (res.success) {
          setPlans((prev) =>
            prev.map((p) => (p.publicId === plan.publicId ? { ...p, status: newStatus } : p))
          );
        } else {
          setErrorMessage(res.error || "Não foi possível alterar a situação do plano.");
        }
      } catch {
        setErrorMessage("Erro ao alterar a situação do plano.");
      } finally {
        setTogglingPlanId(null);
      }
    });
  };

  const handleOpenChargeModal = (plan: ConsultancyPlan) => {
    setChargingPlan(plan);
    setSelectedStudent(null);
    setStudentSearchQuery("");
    setStudentSearchResults([]);
    setChargeError(null);
    setChargeSuccess(null);
    setCopiedLink(false);
  };

  const handleCloseChargeModal = () => {
    setChargingPlan(null);
    setSelectedStudent(null);
    setStudentSearchQuery("");
    setStudentSearchResults([]);
    setChargeError(null);
    setChargeSuccess(null);
    setCopiedLink(false);
  };

  const handleGenerateStudentCharge = () => {
    if (!chargingPlan || !selectedStudent) {
      setChargeError("Selecione um aluno para gerar a cobrança.");
      return;
    }

    setChargeError(null);
    startGeneratingCharge(async () => {
      const formData = new FormData();
      formData.set("studentMembershipPublicId", selectedStudent.membershipPublicId);
      formData.set("planPublicId", chargingPlan.publicId);

      try {
        const res = await createStudentPlanChargeAction(consultancySlug, null, formData);
        if (res.success && res.chargePublicId) {
          setChargeSuccess({
            chargePublicId: res.chargePublicId,
            checkoutUrl: res.checkoutUrl,
            whatsAppHref: res.whatsAppHref,
          });
        } else {
          setChargeError(res.error || "Não foi possível gerar a cobrança.");
        }
      } catch {
        setChargeError("Erro de conexão ao gerar a cobrança do plano.");
      }
    });
  };

  const handleCopyLink = () => {
    if (!chargeSuccess?.checkoutUrl) return;
    navigator.clipboard.writeText(chargeSuccess.checkoutUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 rounded-2xl bg-white border border-[#E5E8E2] shadow-xs">
        <div>
          <h2 className="font-heading text-base font-bold text-[#102E23]">
            Planos da Consultoria
          </h2>
          <p className="text-xs text-[#526058]">
            {canManagePlans
              ? "Cadastre planos esportivos com recebimento automático por Pix ou parcelamento no cartão."
              : "Consulte os planos disponíveis e emita cobranças para seus alunos."}
          </p>
        </div>
        {canManagePlans && (
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-[#176B49] hover:bg-[#125438] transition-colors min-h-[44px] shadow-xs cursor-pointer select-none"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span>+ Criar plano</span>
          </button>
        )}
      </div>

      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
          {errorMessage}
        </div>
      )}

      {/* Plans List */}
      {plans.length === 0 ? (
        <div className="p-8 sm:p-12 rounded-2xl bg-white border border-[#E5E8E2] text-center space-y-4 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-[#176B49] flex items-center justify-center mx-auto">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
            </svg>
          </div>
          <div>
            <h3 className="font-heading text-base font-bold text-zinc-900">
              Nenhum plano cadastrado ainda
            </h3>
            <p className="text-xs text-[#526058] max-w-sm mx-auto mt-1">
              Cadastre planos como Mensal, Trimestral ou Semestral para permitir que seus alunos contratem e paguem pelo app.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#176B49] hover:bg-[#125438] transition-colors min-h-[44px] shadow-xs cursor-pointer"
          >
            + Criar primeiro plano
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map((p) => {
            const durationText = p.durationMonths
              ? `${p.durationMonths} ${p.durationMonths === 1 ? "mês" : "meses"}`
              : p.durationDays
              ? `${p.durationDays} dias`
              : "Mensal";

            const isTogglingThis = togglingPlanId === p.publicId;

            return (
              <div
                key={p.publicId}
                className="bg-white border border-[#E5E8E2] rounded-2xl p-4 sm:p-5 shadow-xs space-y-4 flex flex-col justify-between hover:border-emerald-500/40 transition-all"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-[#176B49] bg-[#E8F0EA] px-2.5 py-0.5 rounded-full border border-[#CDEED5]">
                      {durationText}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                        p.status === "ACTIVE"
                          ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20"
                          : "bg-zinc-100 text-zinc-500 border-zinc-200"
                      }`}
                    >
                      {p.status === "ACTIVE" ? "Ativo" : "Inativo"}
                    </span>
                  </div>

                  <h3 className="font-heading text-lg font-bold text-zinc-900 leading-snug">
                    {p.name}
                  </h3>

                  {p.description && (
                    <p className="text-xs text-zinc-500 line-clamp-2">
                      {p.description}
                    </p>
                  )}
                </div>

                <div className="space-y-3 pt-3 border-t border-zinc-100">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-zinc-500">Preço total:</span>
                    <strong className="text-2xl font-black text-zinc-900 tabular-nums tracking-tight font-mono">
                      {formatBrl(p.amountCents)}
                    </strong>
                  </div>

                  <div className="space-y-1.5 text-xs text-zinc-500">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-0.5 sm:gap-2">
                      <span className="shrink-0">Parcelamento:</span>
                      <span className="font-semibold text-zinc-800 break-words">
                        {p.assuredInstallments > 0
                          ? `Parcelamento no cartão (até ${p.assuredInstallments}x)`
                          : "Parcelamento no cartão"}
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-0.5 sm:gap-2">
                      <span className="shrink-0">Formas aceitas:</span>
                      <span className="font-semibold text-zinc-800">
                        Pix e Cartão
                      </span>
                    </div>
                  </div>

                  {/* Actions buttons */}
                  <div className="pt-2 flex flex-col sm:flex-row items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenChargeModal(p)}
                      disabled={p.status !== "ACTIVE"}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-[#176B49] hover:bg-[#125438] disabled:opacity-40 disabled:cursor-not-allowed transition-colors min-h-[44px] shadow-xs cursor-pointer select-none"
                    >
                      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                      </svg>
                      <span>Cobrar este plano</span>
                    </button>

                    {canManagePlans && (
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(p)}
                        disabled={isTogglingThis || isPending}
                        className="w-full sm:w-auto shrink-0 inline-flex items-center justify-center px-3 py-2.5 rounded-xl text-xs font-semibold border border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 transition-colors min-h-[44px] cursor-pointer"
                      >
                        {isTogglingThis ? "..." : p.status === "ACTIVE" ? "Desativar" : "Ativar"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: CREATE PLAN */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-3xl p-5 sm:p-6 shadow-2xl border border-[#E5E8E2] space-y-4 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E5E8E2] pb-3">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#176B49] bg-[#E8F0EA] px-2.5 py-0.5 rounded-full border border-[#CDEED5]">
                  Novo Plano
                </span>
                <h2 className="font-heading text-lg font-bold text-[#102E23] mt-1">
                  Cadastrar Plano da Consultoria
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="w-8 h-8 rounded-full bg-zinc-100 text-zinc-500 hover:text-zinc-900 flex items-center justify-center cursor-pointer min-h-[32px] min-w-[32px]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePlan} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-zinc-900 block">
                  Nome do Plano <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="Ex: Consultoria Semestral VIP"
                  className="w-full h-11 px-3 rounded-xl border border-zinc-300 bg-white text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-[#176B49] text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-zinc-900 block">
                  Descrição (opcional)
                </label>
                <textarea
                  name="description"
                  rows={2}
                  placeholder="Ex: Acompanhamento de treino + dieta com suporte semanal"
                  className="w-full p-3 rounded-xl border border-zinc-300 bg-white text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-[#176B49] text-xs resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-zinc-900 block">
                    Valor Total (R$) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="amountBrl"
                    required
                    placeholder="900,00"
                    className="w-full h-11 px-3 rounded-xl border border-zinc-300 bg-white text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-[#176B49] text-sm font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-zinc-900 block">
                    Duração em Meses
                  </label>
                  <input
                    type="number"
                    name="durationMonths"
                    min="1"
                    max="60"
                    defaultValue="6"
                    className="w-full h-11 px-3 rounded-xl border border-zinc-300 bg-white text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-[#176B49] text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-zinc-900 block">
                  Parcelamento no Cartão
                </label>
                <select
                  name="assuredInstallments"
                  defaultValue="0"
                  className="w-full h-11 px-3 rounded-xl border border-zinc-300 bg-white text-zinc-900 focus:outline-none focus:border-[#176B49] text-xs"
                >
                  <option value="0">Parcelamento no cartão (taxas pelo comprador)</option>
                  <option value="2">Consultoria absorve taxas em até 2x</option>
                  <option value="3">Consultoria absorve taxas em até 3x</option>
                  <option value="6">Consultoria absorve taxas em até 6x</option>
                  <option value="10">Consultoria absorve taxas em até 10x</option>
                  <option value="12">Consultoria absorve taxas em até 12x</option>
                </select>
                <p className="text-[11px] text-zinc-500">
                  Define se a consultoria absorve parte das taxas de parcelamento no cartão no checkout InfinitePay.
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

              <div className="pt-2 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 border-t border-[#E5E8E2]">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  disabled={isPending}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold text-zinc-600 hover:text-zinc-900 border border-zinc-300 hover:bg-zinc-100 min-h-[44px] cursor-pointer flex items-center justify-center"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#176B49] hover:bg-[#125438] disabled:opacity-50 transition-all min-h-[44px] shadow-xs cursor-pointer"
                >
                  {isPending ? "Cadastrando plano..." : "Cadastrar Plano"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: COBRAR ESTE PLANO (QUICK STUDENT CHARGE) */}
      {chargingPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-3xl p-5 sm:p-6 shadow-2xl border border-[#E5E8E2] space-y-4 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#E5E8E2] pb-3">
              <div className="space-y-0.5">
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#176B49] bg-[#E8F0EA] px-2.5 py-0.5 rounded-full border border-[#CDEED5]">
                  Cobrança de Plano
                </span>
                <h2 className="font-heading text-lg font-bold text-[#102E23]">
                  Cobrar {chargingPlan.name}
                </h2>
              </div>
              <button
                type="button"
                onClick={handleCloseChargeModal}
                className="w-8 h-8 rounded-full bg-zinc-100 text-zinc-500 hover:text-zinc-900 flex items-center justify-center cursor-pointer min-h-[32px] min-w-[32px]"
              >
                ✕
              </button>
            </div>

            {chargeSuccess ? (
              /* Success Screen */
              <div className="space-y-4 py-2 text-center">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-[#176B49] border border-emerald-500/20 flex items-center justify-center mx-auto shadow-2xs">
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </div>

                <div className="space-y-1">
                  <h3 className="font-heading text-lg font-bold text-zinc-900">
                    Cobrança Gerada com Sucesso!
                  </h3>
                  <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                    O link de pagamento foi criado via InfinitePay para {selectedStudent?.fullName}.
                  </p>
                </div>

                {chargeSuccess.checkoutUrl && (
                  <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl flex items-center justify-between gap-2 text-xs">
                    <span className="truncate font-mono text-zinc-600 text-[11px] select-all">
                      {chargeSuccess.checkoutUrl}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="shrink-0 px-3 py-1.5 rounded-lg font-bold text-xs bg-white hover:bg-zinc-100 border border-zinc-200 text-zinc-900 cursor-pointer min-h-[36px]"
                    >
                      {copiedLink ? "✓ Copiado!" : "Copiar link"}
                    </button>
                  </div>
                )}

                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
                  {chargeSuccess.whatsAppHref && (
                    <a
                      href={chargeSuccess.whatsAppHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#25D366] hover:bg-[#1EBE5D] transition-colors min-h-[44px] shadow-xs"
                    >
                      <span>Enviar pelo WhatsApp</span>
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z"/>
                      </svg>
                    </a>
                  )}

                  <button
                    type="button"
                    onClick={handleCloseChargeModal}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold text-zinc-600 hover:text-zinc-900 border border-zinc-200 min-h-[44px] cursor-pointer"
                  >
                    Concluir
                  </button>
                </div>
              </div>
            ) : (
              /* Selection Screen */
              <div className="space-y-4 text-xs">
                {/* Plan Summary Pill */}
                <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-zinc-900 text-sm break-words">
                      {chargingPlan.name}
                    </p>
                    <p className="text-zinc-500 text-[11px] break-words">
                      Pix e Cartão ({chargingPlan.assuredInstallments > 0 ? `Parcelamento no cartão em até ${chargingPlan.assuredInstallments}x` : "Parcelamento no cartão"})
                    </p>
                  </div>
                  <strong className="text-lg font-black text-emerald-600 tabular-nums font-mono shrink-0">
                    {formatBrl(chargingPlan.amountCents)}
                  </strong>
                </div>

                {/* Student Selection */}
                <div className="space-y-1.5">
                  <label className="font-bold text-zinc-900 block">
                    Selecione o Aluno <span className="text-rose-500">*</span>
                  </label>

                  {selectedStudent ? (
                    <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-300 rounded-xl">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs">
                          {selectedStudent.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-zinc-900 text-xs">
                            {selectedStudent.fullName}
                          </p>
                          <p className="text-[11px] text-zinc-500">
                            {selectedStudent.email}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedStudent(null);
                          setStudentSearchQuery("");
                          setStudentSearchResults([]);
                        }}
                        className="text-xs font-semibold text-rose-600 hover:text-rose-700 px-2 py-1 rounded cursor-pointer min-h-[36px]"
                      >
                        Trocar
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Digite o nome ou e-mail do aluno..."
                        value={studentSearchQuery}
                        onChange={(e) => setStudentSearchQuery(e.target.value)}
                        className="w-full h-11 px-3 rounded-xl border border-zinc-300 bg-white text-zinc-900 placeholder:text-zinc-400 text-xs focus:outline-none focus:border-[#176B49]"
                      />
                      {isSearchingStudent && (
                        <span className="absolute right-3 top-3 text-[11px] text-zinc-400">
                          Buscando...
                        </span>
                      )}

                      {!selectedStudent && studentSearchQuery.trim().length >= 2 && studentSearchResults.length > 0 && (
                        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-zinc-200 rounded-xl shadow-xl max-h-48 overflow-y-auto z-20 divide-y divide-zinc-100">
                          {studentSearchResults.map((st) => (
                            <button
                              key={st.membershipPublicId}
                              type="button"
                              onClick={() => {
                                setSelectedStudent(st);
                                setStudentSearchResults([]);
                              }}
                              className="w-full text-left p-3 hover:bg-zinc-50 transition-colors flex items-center justify-between min-h-[44px] cursor-pointer"
                            >
                              <div>
                                <p className="font-bold text-zinc-900 text-xs">{st.fullName}</p>
                                <p className="text-[11px] text-zinc-500">{st.email}</p>
                              </div>
                              <span className="text-xs font-bold text-emerald-600">Selecionar</span>
                            </button>
                          ))}
                        </div>
                      )}

                      {!selectedStudent && studentSearchQuery.trim().length >= 2 && !isSearchingStudent && studentSearchResults.length === 0 && (
                        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-zinc-200 rounded-xl p-3 shadow-xl z-20 text-xs text-zinc-500 text-center">
                          Nenhum aluno encontrado.
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {chargeError && (
                  <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 p-2.5 rounded-xl font-medium">
                    {chargeError}
                  </p>
                )}

                <div className="pt-2 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 border-t border-[#E5E8E2]">
                  <button
                    type="button"
                    onClick={handleCloseChargeModal}
                    disabled={isGeneratingCharge}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold text-zinc-600 hover:text-zinc-900 border border-zinc-300 hover:bg-zinc-100 min-h-[44px] cursor-pointer flex items-center justify-center"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleGenerateStudentCharge}
                    disabled={isGeneratingCharge || !selectedStudent}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#176B49] hover:bg-[#125438] disabled:opacity-50 transition-all min-h-[44px] shadow-xs cursor-pointer select-none"
                  >
                    {isGeneratingCharge ? "Gerando cobrança..." : "Gerar link de pagamento"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
