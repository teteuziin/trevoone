"use client";

import React, { useState, useTransition } from "react";
import { cancelStudentChargeAction } from "@/app/consultoria/[slug]/financeiro/actions";
import { FormField, Input } from "@/components/ui/form-controls";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

interface ChargeCancelDialogProps {
  slug: string;
  chargePublicId: string;
  chargeTitle: string;
}

export function ChargeCancelDialog({
  slug,
  chargePublicId,
  chargeTitle,
}: ChargeCancelDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleCancel = () => {
    setError(null);
    startTransition(async () => {
      const res = await cancelStudentChargeAction(slug, chargePublicId, reason);
      if (!res.success) {
        setError(res.error || "Não foi possível cancelar a cobrança.");
      } else {
        setIsOpen(false);
      }
    });
  };

  return (
    <>
      <Button
        type="button"
        variant="danger"
        size="sm"
        onClick={() => setIsOpen(true)}
      >
        Cancelar cobrança
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-zinc-200 space-y-4 animate-in zoom-in-95 duration-150"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-dialog-title"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <h3 id="cancel-dialog-title" className="text-base font-bold text-zinc-900">
                  Cancelar Cobrança
                </h3>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Tem certeza que deseja cancelar a cobrança &ldquo;{chargeTitle}&rdquo;? Esta ação não pode ser desfeita.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                disabled={isPending}
                className="text-zinc-400 hover:text-zinc-700 p-1 rounded-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {error && (
              <Alert variant="danger" title="Erro">
                <p className="text-xs">{error}</p>
              </Alert>
            )}

            <FormField label="Motivo do Cancelamento" optional id="cancelReason">
              <Input
                name="cancelReason"
                type="text"
                placeholder="Ex: Acordo direto, troca de plano, cancelamento de matrícula"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={isPending}
                maxLength={255}
              />
            </FormField>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsOpen(false)}
                disabled={isPending}
              >
                Manter cobrança
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={handleCancel}
                disabled={isPending}
              >
                {isPending ? "Cancelando..." : "Confirmar cancelamento"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
