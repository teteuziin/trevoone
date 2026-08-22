"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FormField, Input } from "@/components/ui/form-controls";
import { Alert } from "@/components/ui/alert";
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
      <Alert variant="success" title="Comprovante Aprovado">
        <p className="text-xs">
          O pagamento de {formattedAmount} foi confirmado e a cobrança de {studentName} foi liquidada com sucesso.
        </p>
      </Alert>
    );
  }

  if (receiptStatus === "REJECTED") {
    return (
      <Alert variant="danger" title="Comprovante Rejeitado">
        <p className="text-xs">
          Este envio foi rejeitado e o aluno foi notificado para submeter um novo comprovante.
        </p>
      </Alert>
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
        <Alert variant="danger" title="Atenção">
          <p className="text-xs">{errorMessage}</p>
        </Alert>
      )}

      <div className="space-y-2">
        <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">Decisão do Comprovante</h3>
        <p className="text-xs text-zinc-500">
          Confirme a legitimidade do comprovante Pix para alterar o status da cobrança.
        </p>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-2">
          <Button
            type="button"
            variant="primary"
            size="md"
            className="flex-1"
            onClick={() => {
              setErrorMessage(null);
              setShowApproveModal(true);
            }}
            disabled={isPending}
          >
            Aprovar Pagamento
          </Button>

          <Button
            type="button"
            variant="outline"
            size="md"
            className="flex-1 border-red-200 text-red-700 hover:bg-red-50 hover:border-red-300"
            onClick={() => {
              setErrorMessage(null);
              setShowRejectModal(true);
            }}
            disabled={isPending}
          >
            Rejeitar Comprovante
          </Button>
        </div>
      </div>

      {/* Modal de Confirmação de Aprovação */}
      {showApproveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-zinc-200 space-y-4 animate-in zoom-in-95 duration-150"
            role="dialog"
            aria-modal="true"
          >
            <div className="space-y-1">
              <h3 className="text-base font-bold text-zinc-900">Aprovar Pagamento</h3>
              <p className="text-xs text-zinc-600 leading-relaxed">
                Você confirma a aprovação do comprovante no valor de{" "}
                <strong className="text-zinc-900 font-bold">{formattedAmount}</strong> para o aluno{" "}
                <strong className="text-zinc-900 font-semibold">{studentName}</strong>?
              </p>
              <p className="text-[11px] text-emerald-700 bg-emerald-50 p-2.5 rounded-lg border border-emerald-200 mt-2">
                A cobrança &ldquo;{chargeTitle}&rdquo; será liquidada e o acesso do aluno será liberado.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowApproveModal(false)}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button
                type="button"
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

      {/* Modal de Rejeição */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-zinc-200 space-y-4 animate-in zoom-in-95 duration-150"
            role="dialog"
            aria-modal="true"
          >
            <div className="space-y-1">
              <h3 className="text-base font-bold text-zinc-900">Rejeitar Comprovante</h3>
              <p className="text-xs text-zinc-600 leading-relaxed">
                Informe o motivo da rejeição para que o aluno {studentName} possa enviar um novo comprovante correto.
              </p>
            </div>

            <FormField label="Motivo da Rejeição" required id="rejectionReason">
              <Input
                name="rejectionReason"
                type="text"
                placeholder="Ex: Imagem ilegível, valor incorreto ou data divergente"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                disabled={isPending}
                maxLength={255}
              />
            </FormField>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowRejectModal(false)}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
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
