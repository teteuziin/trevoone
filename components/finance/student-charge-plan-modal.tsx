"use client";

import React, { useState, useTransition } from "react";
import { createStudentPlanChargeAction } from "@/app/consultoria/[slug]/financeiro/actions";
import type { StudentPlanSummaryItem } from "@/lib/consultancies/personal-student-hub";

interface StudentChargePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  consultancySlug: string;
  studentMembershipPublicId: string;
  studentName: string;
  availablePlans: StudentPlanSummaryItem[];
  onChargeCreated?: () => void;
}

export function StudentChargePlanModal({
  isOpen,
  onClose,
  consultancySlug,
  studentMembershipPublicId,
  studentName,
  availablePlans,
  onChargeCreated,
}: StudentChargePlanModalProps) {
  const [selectedPlanId, setSelectedPlanId] = useState<string>(
    availablePlans.length > 0 ? availablePlans[0].publicId : ""
  );
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdResult, setCreatedResult] = useState<{
    chargePublicId: string;
    checkoutUrl?: string;
    whatsAppHref?: string;
  } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  if (!isOpen) return null;

  const handleCreateCharge = () => {
    if (!selectedPlanId) {
      setErrorMessage("Selecione um plano.");
      return;
    }

    setErrorMessage(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("studentMembershipPublicId", studentMembershipPublicId);
      formData.set("planPublicId", selectedPlanId);

      try {
        const res = await createStudentPlanChargeAction(consultancySlug, null, formData);
        if (res.success && res.chargePublicId) {
          setCreatedResult({
            chargePublicId: res.chargePublicId,
            checkoutUrl: res.checkoutUrl,
            whatsAppHref: res.whatsAppHref,
          });
          if (onChargeCreated) onChargeCreated();
        } else {
          setErrorMessage(res.error || "Não foi possível gerar a cobrança.");
        }
      } catch {
        setErrorMessage("Erro de conexão ao gerar cobrança.");
      }
    });
  };

  const handleCopyLink = () => {
    if (!createdResult?.checkoutUrl) return;
    navigator.clipboard.writeText(createdResult.checkoutUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const formatBrl = (cents: number) =>
    (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const selectedPlan = availablePlans.find((p) => p.publicId === selectedPlanId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl border border-[#E5E8E2] space-y-5 animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#E5E8E2] pb-3.5">
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#176B49] bg-[#E8F0EA] px-2.5 py-0.5 rounded-full border border-[#CDEED5]">
              Financeiro do Aluno
            </span>
            <h2 className="font-heading text-lg font-bold text-[#102E23]">
              Cobrar Plano de {studentName}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#FAF9F6] text-[#5A6660] hover:text-[#102E23] hover:bg-[#EBEBE5] flex items-center justify-center transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {createdResult ? (
          /* Success Screen: Link Ready & WhatsApp Action */
          <div className="space-y-4 py-2 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#E8F0EA] text-[#176B49] border border-[#CDEED5] flex items-center justify-center mx-auto shadow-2xs">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>

            <div className="space-y-1">
              <h3 className="font-heading text-lg font-bold text-[#102E23]">
                Cobrança Gerada com Sucesso!
              </h3>
              <p className="text-xs text-[#5A6660] max-w-sm mx-auto">
                O link de pagamento foi criado via InfinitePay. O aluno pode pagar por Pix ou Cartão de Crédito.
              </p>
            </div>

            {createdResult.checkoutUrl && (
              <div className="p-3 bg-[#FAF9F6] border border-[#E5E8E2] rounded-xl flex items-center justify-between gap-2 text-xs">
                <span className="truncate font-mono text-[#5A6660] text-[11px] select-all">
                  {createdResult.checkoutUrl}
                </span>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="shrink-0 px-3 py-1.5 rounded-lg font-bold text-xs bg-white hover:bg-[#FAF9F6] border border-[#E5E8E2] text-[#102E23] cursor-pointer"
                >
                  {copiedLink ? "✓ Copiado!" : "Copiar"}
                </button>
              </div>
            )}

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
              {createdResult.whatsAppHref && (
                <a
                  href={createdResult.whatsAppHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#25D366] hover:bg-[#1EBE5D] transition-colors min-h-[42px] shadow-xs"
                >
                  <span>Enviar pelo WhatsApp</span>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z"/>
                  </svg>
                </a>
              )}
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold text-[#102E23] bg-[#FAF9F6] hover:bg-[#EBEBE5] border border-[#E5E8E2] transition-colors min-h-[42px] cursor-pointer"
              >
                Concluir
              </button>
            </div>
          </div>
        ) : (
          /* Form: Plan Selection & Conditions */
          <div className="space-y-4">
            {availablePlans.length === 0 ? (
              <div className="p-5 rounded-2xl bg-[#FAF9F6] border border-[#E5E8E2] text-center space-y-2">
                <p className="text-xs text-[#5A6660]">
                  Sua consultoria ainda não possui planos comerciais cadastrados.
                </p>
                <p className="text-[11px] text-[#5A6660]">
                  Cadastre planos na área de Gestão Financeira para emitir cobranças com ativação automática.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                <label className="text-xs font-bold text-[#102E23] block">
                  Selecione o plano desejado:
                </label>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {availablePlans.map((plan) => {
                    const isSelected = selectedPlanId === plan.publicId;
                    const durationText = plan.durationMonths
                      ? `${plan.durationMonths} ${plan.durationMonths === 1 ? "mês" : "meses"}`
                      : plan.durationDays
                      ? `${plan.durationDays} dias`
                      : "Mensal";

                    return (
                      <div
                        key={plan.publicId}
                        onClick={() => setSelectedPlanId(plan.publicId)}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isSelected
                            ? "bg-[#E8F0EA] border-[#176B49] shadow-xs"
                            : "bg-[#FAF9F6] border-[#E5E8E2] hover:border-zinc-300"
                        }`}
                      >
                        <div className="space-y-0.5 min-w-0">
                          <p className="font-bold text-sm text-[#102E23] truncate">
                            {plan.name}
                          </p>
                          <p className="text-xs text-[#5A6660]">
                            Duração: {durationText}
                            {plan.assuredInstallments > 0
                              ? ` • Até ${plan.assuredInstallments}x sem juros`
                              : ""}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-extrabold text-sm text-[#176B49] block">
                            {formatBrl(plan.amountCents)}
                          </span>
                          <span className="text-[10px] text-[#5A6660]">Pix ou Cartão</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Conditions Card */}
            {selectedPlan && (
              <div className="p-3.5 rounded-xl bg-[#FAF9F6] border border-[#E5E8E2] text-xs space-y-1 text-[#5A6660]">
                <div className="flex justify-between">
                  <span>Valor oficial:</span>
                  <strong className="text-[#102E23] font-bold">{formatBrl(selectedPlan.amountCents)}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Parcelamento:</span>
                  <span className="text-[#102E23]">
                    {selectedPlan.assuredInstallments > 0
                      ? `Taxa assumida até ${selectedPlan.assuredInstallments}x`
                      : "Taxas de parcelamento no cartão"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Ativação:</span>
                  <span className="text-[#176B49] font-semibold">100% Automática após confirmação</span>
                </div>
              </div>
            )}

            {errorMessage && (
              <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 p-2.5 rounded-xl font-medium">
                {errorMessage}
              </p>
            )}

            {/* Actions */}
            <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-[#E5E8E2]">
              <button
                type="button"
                onClick={onClose}
                disabled={isPending}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-[#5A6660] hover:text-[#102E23] transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCreateCharge}
                disabled={isPending || availablePlans.length === 0}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#176B49] hover:bg-[#125438] disabled:opacity-50 transition-all min-h-[42px] shadow-xs cursor-pointer"
              >
                {isPending ? (
                  <>
                    <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Gerando cobrança...</span>
                  </>
                ) : (
                  <span>Gerar Cobrança e Link</span>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
