"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { reconcilePaymentAction } from "@/app/consultoria/[slug]/pagamentos/actions";

interface ReconcilePaymentButtonProps {
  consultancySlug: string;
  chargePublicId: string;
  transactionNsu?: string;
  slugParam?: string;
}

export function ReconcilePaymentButton({
  consultancySlug,
  chargePublicId,
  transactionNsu,
  slugParam,
}: ReconcilePaymentButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleCheck = () => {
    startTransition(async () => {
      try {
        const res = await reconcilePaymentAction(
          consultancySlug,
          chargePublicId,
          transactionNsu,
          slugParam
        );
        if (res.isPaid) {
          router.refresh();
        } else {
          setStatusMessage(res.message);
        }
      } catch {
        setStatusMessage("Erro ao verificar status. Tente novamente.");
      }
    });
  };

  return (
    <div className="space-y-2 w-full sm:w-auto">
      <button
        type="button"
        onClick={handleCheck}
        disabled={isPending}
        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm text-white bg-[#176B49] hover:bg-[#125438] disabled:opacity-50 transition-all min-h-[48px] shadow-xs cursor-pointer"
      >
        {isPending ? (
          <>
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Verificando com InfinitePay...</span>
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            <span>Verificar agora</span>
          </>
        )}
      </button>
      {statusMessage && (
        <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">{statusMessage}</p>
      )}
    </div>
  );
}
