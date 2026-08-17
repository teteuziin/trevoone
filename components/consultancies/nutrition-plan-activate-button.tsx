"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { activateNutritionPlanAction } from "@/app/consultoria/[slug]/nutricao/planos/actions";

interface NutritionPlanActivateButtonProps {
  slug: string;
  planPublicId: string;
  planStatus: string;
}

export function NutritionPlanActivateButton({
  slug,
  planPublicId,
  planStatus,
}: NutritionPlanActivateButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // O botão de ativação só aparece para planos em rascunho (DRAFT)
  if (planStatus !== "DRAFT") {
    return null;
  }

  function handleOpen() {
    setError(null);
    setIsOpen(true);
  }

  function handleClose() {
    if (isPending) return;
    setError(null);
    setIsOpen(false);
  }

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await activateNutritionPlanAction(slug, planPublicId);
        if (!res.success) {
          setError(res.error || "Erro ao ativar plano alimentar.");
          return;
        }

        setIsOpen(false);
        router.refresh();
      } catch {
        setError("Ocorreu um erro inesperado ao ativar o plano.");
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-lg shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1"
        aria-haspopup="dialog"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        Ativar plano
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby="activate-plan-title"
          aria-describedby="activate-plan-desc"
        >
          <div
            className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-5 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>

              <div className="space-y-1 min-w-0">
                <h3 id="activate-plan-title" className="text-base font-bold text-slate-900">
                  Ativar plano alimentar?
                </h3>
                <p id="activate-plan-desc" className="text-xs text-slate-600 leading-relaxed">
                  Após a ativação, este plano ficará em vigor para o aluno e passará a ser somente para
                  leitura. Se houver outro plano ativo para este aluno, ele será arquivado automaticamente.
                </p>
              </div>
            </div>

            {error && (
              <div
                className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 space-y-1"
                role="alert"
              >
                <div className="font-semibold flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Não foi possível ativar o plano
                </div>
                <p className="pl-5.5">{error}</p>
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={isPending}
                onClick={handleClose}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-50 rounded-xl transition-all"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={isPending}
                onClick={handleConfirm}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 rounded-xl shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1"
              >
                {isPending ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Ativando...
                  </>
                ) : (
                  "Confirmar ativação"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
