"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { markStudentChargePaidAction } from "@/app/consultoria/[slug]/financeiro/actions";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

function formatCentsToBrl(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

interface ChargeMarkPaidDialogProps {
  slug: string;
  chargePublicId: string;
  chargeTitle: string;
  studentName: string;
  amountCents: number;
  hasGatewayCheckout?: boolean;
  onSuccess?: () => void;
}

const PAYMENT_METHODS = [
  {
    id: "PIX_MANUAL",
    label: "Pix manual direto",
    description: "Transferência Pix recebida diretamente na conta bancária",
  },
  {
    id: "DINHEIRO",
    label: "Dinheiro em espécie",
    description: "Pagamento realizado presencialmente em dinheiro",
  },
  {
    id: "TRANSFERENCIA",
    label: "Transferência bancária (TED/DOC)",
    description: "Depósito ou transferência bancária confirmada",
  },
  {
    id: "MAQUININHA_EXTERNA",
    label: "Maquininha externa / Cartão presencial",
    description: "Passado na máquina de cartão do treinador/consultoria",
  },
] as const;

export function ChargeMarkPaidDialog({
  slug,
  chargePublicId,
  chargeTitle,
  studentName,
  amountCents,
  hasGatewayCheckout = false,
  onSuccess,
}: ChargeMarkPaidDialogProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>("PIX_MANUAL");
  const [paidAtDate, setPaidAtDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleConfirm = () => {
    if (!isConfirmed) {
      setError("Você deve confirmar expressamente o recebimento do valor para prosseguir.");
      return;
    }

    if (!paymentMethod) {
      setError("Selecione a forma de pagamento recebida.");
      return;
    }

    if (!paidAtDate) {
      setError("Informe a data de recebimento do pagamento.");
      return;
    }

    setError(null);
    startTransition(async () => {
      const res = await markStudentChargePaidAction(
        slug,
        chargePublicId,
        paymentMethod,
        paidAtDate,
        notes.trim() || undefined
      );

      if (!res.success) {
        setError(res.error || "Não foi possível confirmar o pagamento.");
      } else {
        setIsOpen(false);
        if (onSuccess) {
          onSuccess();
        } else {
          router.refresh();
        }
      }
    });
  };

  if (hasGatewayCheckout) {
    return (
      <div className="inline-flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-[44px] px-4 font-semibold text-xs opacity-60 cursor-not-allowed text-[#526058] border-[#D5DDD6]"
          onClick={() => {
            alert(
              "Esta cobrança possui checkout InfinitePay ativo. Para evitar pagamentos duplicados, a confirmação ocorre de forma 100% automática assim que o aluno pagar pelo link."
            );
          }}
          title="Checkout InfinitePay ativo — confirmação automática"
        >
          <span className="flex items-center gap-1.5">
            <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <span>Marcar como pago (Gateway ativo)</span>
          </span>
        </Button>
      </div>
    );
  }

  return (
    <>
      <Button
        type="button"
        variant="primary"
        size="sm"
        className="min-h-[44px] px-4 font-bold text-xs bg-[#176B49] hover:bg-[#125438] text-white shadow-xs cursor-pointer select-none"
        onClick={() => {
          setError(null);
          setIsOpen(true);
        }}
      >
        <span className="flex items-center gap-1.5">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
          <span>Marcar como pago</span>
        </span>
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
          <div
            className="w-full max-w-lg bg-white rounded-3xl p-5 sm:p-7 shadow-2xl border border-[#E5E8E2] space-y-5 my-auto max-h-[92vh] overflow-y-auto animate-in zoom-in-95 duration-150 text-[#102E23]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mark-paid-dialog-title"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-[#E5E8E2] pb-4">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-[#176B49] uppercase tracking-wider bg-[#E2F5EC] px-2.5 py-0.5 rounded-full border border-[#B8E6D0]">
                  Gestão Financeira
                </span>
                <h3 id="mark-paid-dialog-title" className="text-lg font-extrabold text-[#102E23] tracking-tight">
                  Confirmar Pagamento Manual
                </h3>
                <p className="text-xs text-[#526058] leading-relaxed">
                  Confirme o recebimento para liquidar a cobrança e ativar imediatamente os recursos contratados pelo aluno.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                disabled={isPending}
                className="text-zinc-400 hover:text-zinc-600 p-2 rounded-xl min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors cursor-pointer shrink-0"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Charge Details Pill */}
            <div className="p-3.5 rounded-2xl bg-[#F5F5F0] border border-[#DEE2DA] space-y-1.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-[#526058]">Aluno:</span>
                <strong className="text-[#102E23] font-bold">{studentName}</strong>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#526058]">Cobrança:</span>
                <span className="text-[#102E23] font-medium truncate max-w-[220px]">{chargeTitle}</span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-[#E5E8E2]">
                <span className="text-[#526058] font-bold">Valor a Liquidar:</span>
                <span className="text-[#176B49] font-black text-sm font-sans tabular-nums">
                  {formatCentsToBrl(amountCents)}
                </span>
              </div>
            </div>

            {error && (
              <Alert variant="danger" title="Atenção">
                <p className="text-xs">{error}</p>
              </Alert>
            )}

            {/* Payment Method Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-[#102E23]">
                Forma de recebimento <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PAYMENT_METHODS.map((method) => {
                  const isSelected = paymentMethod === method.id;
                  return (
                    <div
                      key={method.id}
                      onClick={() => setPaymentMethod(method.id)}
                      className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                        isSelected
                          ? "bg-[#E2F5EC] border-[#176B49] shadow-2xs text-[#102E23]"
                          : "bg-white border-[#D5DDD6] text-[#526058] hover:border-zinc-400"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                            isSelected ? "border-[#176B49] bg-[#176B49]" : "border-[#A0ABA4]"
                          }`}
                        >
                          {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                        <span className="font-bold text-xs">{method.label}</span>
                      </div>
                      <p className="text-[11px] text-[#526058] mt-1 pl-5 leading-tight">
                        {method.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Date and Reference */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label htmlFor="mark-paid-date" className="block text-xs font-bold text-[#102E23]">
                  Data de recebimento <span className="text-rose-500">*</span>
                </label>
                <input
                  id="mark-paid-date"
                  type="date"
                  value={paidAtDate}
                  onChange={(e) => setPaidAtDate(e.target.value)}
                  max={new Date().toISOString().slice(0, 10)}
                  disabled={isPending}
                  className="w-full h-11 px-3.5 rounded-xl border border-[#D5DDD6] bg-white text-[#102E23] text-xs focus:outline-none focus:border-[#176B49] focus:ring-2 focus:ring-[#176B49]/15 shadow-2xs"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="mark-paid-notes" className="block text-xs font-bold text-[#102E23]">
                  Referência / Comprovante <span className="text-[#526058] font-normal text-[11px]">(opcional)</span>
                </label>
                <input
                  id="mark-paid-notes"
                  type="text"
                  placeholder="Ex: Comprovante WhatsApp, NSU, TED..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={isPending}
                  maxLength={255}
                  className="w-full h-11 px-3.5 rounded-xl border border-[#D5DDD6] bg-white text-[#102E23] placeholder:text-[#526058]/60 focus:outline-none focus:border-[#176B49] focus:ring-2 focus:ring-[#176B49]/15 text-xs shadow-2xs"
                />
              </div>
            </div>

            {/* Explicit Confirmation Checkbox */}
            <div className="p-3.5 bg-[#F9FAF8] rounded-2xl border border-[#DEE2DA] flex items-start gap-3">
              <input
                id="mark-paid-confirm-checkbox"
                type="checkbox"
                checked={isConfirmed}
                onChange={(e) => {
                  setIsConfirmed(e.target.checked);
                  if (error) setError(null);
                }}
                disabled={isPending}
                className="mt-0.5 w-4 h-4 rounded border-[#D5DDD6] text-[#176B49] focus:ring-[#176B49] cursor-pointer shrink-0"
              />
              <label htmlFor="mark-paid-confirm-checkbox" className="text-xs text-[#102E23] leading-relaxed cursor-pointer select-none">
                <strong className="font-bold block text-[#102E23]">Confirmo o recebimento integral</strong>
                <span className="text-[#526058] text-[11px]">
                  Declaro que o valor de {formatCentsToBrl(amountCents)} foi recebido e autorizo a ativação imediata do período e recursos deste aluno.
                </span>
              </label>
            </div>

            {/* Dialog Actions */}
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-2 border-t border-[#E5E8E2]">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-h-[44px] px-5 font-bold text-xs border-[#D5DDD6] text-[#526058] hover:text-[#102E23]"
                onClick={() => setIsOpen(false)}
                disabled={isPending}
              >
                Voltar
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                className="min-h-[44px] px-6 font-bold text-xs bg-[#176B49] hover:bg-[#125438] text-white disabled:opacity-40 disabled:cursor-not-allowed shadow-xs cursor-pointer select-none"
                onClick={handleConfirm}
                disabled={isPending || !isConfirmed}
              >
                {isPending ? (
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span>Confirmando pagamento...</span>
                  </span>
                ) : (
                  <span>Confirmar pagamento e ativar acesso</span>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
