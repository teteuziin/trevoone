"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  approvePaymentReceiptAction,
  rejectPaymentReceiptAction,
} from "@/app/consultoria/[slug]/financeiro/comprovantes/actions";

type ReceiptReviewActionsProps = {
  slug: string;
  receiptPublicId: string;
  studentName: string;
  chargeTitle: string;
  formattedAmount: string;
  receiptStatus: "SUBMITTED" | "APPROVED" | "REJECTED";
};

export function ReceiptReviewActions({
  slug,
  receiptPublicId,
  studentName,
  chargeTitle,
  formattedAmount,
  receiptStatus,
}: ReceiptReviewActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (receiptStatus === "APPROVED") {
    return (
      <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-emerald-100 text-[#008f4c] flex items-center justify-center shrink-0">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-bold text-emerald-950">Comprovante Aprovado</p>
          <p className="text-xs text-emerald-800">
            O pagamento foi confirmado e a cobrança foi liquidada com sucesso.
          </p>
        </div>
      </div>
    );
  }

  if (receiptStatus === "REJECTED") {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-bold text-red-950">Comprovante Rejeitado</p>
          <p className="text-xs text-red-800">
            Este envio foi rejeitado e o aluno pode submeter um novo comprovante.
          </p>
        </div>
      </div>
    );
  }

  const handleApprove = () => {
    setErrorMessage(null);
    startTransition(async () => {
      const res = await approvePaymentReceiptAction({
        slug,
        receiptPublicId,
      });

      if (!res.success) {
        setErrorMessage(res.error || "Ocorreu um erro ao aprovar o comprovante.");
        return;
      }

      setShowApproveModal(false);
      router.refresh();
    });
  };

  const handleReject = () => {
    const trimmed = rejectionReason.trim();
    if (!trimmed) {
      setErrorMessage("O motivo da rejeição é obrigatório.");
      return;
    }

    if (trimmed.length > 255) {
      setErrorMessage("O motivo da rejeição deve ter no máximo 255 caracteres.");
      return;
    }

    setErrorMessage(null);
    startTransition(async () => {
      const res = await rejectPaymentReceiptAction({
        slug,
        receiptPublicId,
        rejectionReason: trimmed,
      });

      if (!res.success) {
        setErrorMessage(res.error || "Ocorreu um erro ao rejeitar o comprovante.");
        return;
      }

      setShowRejectModal(false);
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      {errorMessage && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
          <svg className="w-4 h-4 text-red-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Botões de Ação Principais */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <Button
          variant="primary"
          size="lg"
          className="flex-1 shadow-sm"
          onClick={() => {
            setErrorMessage(null);
            setShowApproveModal(true);
          }}
          disabled={isPending}
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
          Aprovar pagamento
        </Button>

        <Button
          variant="outline"
          size="lg"
          className="flex-1 border-red-200 text-red-700 hover:bg-red-50 hover:border-red-300"
          onClick={() => {
            setErrorMessage(null);
            setShowRejectModal(true);
          }}
          disabled={isPending}
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
          Rejeitar comprovante
        </Button>
      </div>

      {/* Modal de Confirmação de Aprovação */}
      {showApproveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white border border-zinc-200 rounded-2xl shadow-xl max-w-md w-full p-5 sm:p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-50 text-[#008f4c] flex items-center justify-center shrink-0 border border-emerald-100">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900">Aprovar Pagamento</h3>
                <p className="text-xs text-zinc-500">Confirmação manual de recebimento</p>
              </div>
            </div>

            <div className="p-3.5 bg-zinc-50 border border-zinc-100 rounded-xl space-y-1.5 text-xs text-zinc-700">
              <p>
                <span className="font-semibold text-zinc-900">Aluno:</span> {studentName}
              </p>
              <p>
                <span className="font-semibold text-zinc-900">Cobrança:</span> {chargeTitle}
              </p>
              <p>
                <span className="font-semibold text-zinc-900">Valor confirmado:</span>{" "}
                <span className="font-bold text-emerald-700">{formattedAmount}</span>
              </p>
            </div>

            <p className="text-xs text-zinc-600 leading-relaxed">
              Esta ação registrará o pagamento como recebido via Pix manual, marcando a cobrança como <strong>Paga</strong>.
            </p>

            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                {errorMessage}
              </div>
            )}

            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowApproveModal(false)}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleApprove}
                disabled={isPending}
              >
                {isPending ? "Aprovando..." : "Confirmar Aprovação"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Rejeição de Comprovante */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white border border-zinc-200 rounded-2xl shadow-xl max-w-md w-full p-5 sm:p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center shrink-0 border border-red-100">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900">Rejeitar Comprovante</h3>
                <p className="text-xs text-zinc-500">O aluno poderá enviar um novo arquivo</p>
              </div>
            </div>

            <p className="text-xs text-zinc-600 leading-relaxed">
              Informe o motivo da rejeição para que o aluno saiba o que corrigir ao enviar um novo comprovante.
            </p>

            <div className="space-y-1.5">
              <label htmlFor="rejection-reason" className="block text-xs font-semibold text-zinc-700">
                Motivo da rejeição <span className="text-red-500">*</span>
              </label>
              <textarea
                id="rejection-reason"
                rows={3}
                maxLength={255}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Ex: Comprovante ilegível, valor divergente, comprovante de agendamento não efetivado..."
                className="w-full text-xs text-zinc-900 border border-zinc-300 rounded-xl p-3 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
                disabled={isPending}
              />
              <div className="flex justify-end">
                <span className="text-[11px] text-zinc-400">
                  {rejectionReason.length} / 255 caracteres
                </span>
              </div>
            </div>

            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                {errorMessage}
              </div>
            )}

            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRejectModal(false)}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={handleReject}
                disabled={isPending || !rejectionReason.trim()}
              >
                {isPending ? "Rejeitando..." : "Confirmar Rejeição"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
