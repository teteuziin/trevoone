"use client";

import React, { useState, useEffect, useCallback } from "react";
import { startOrResumeWorkoutExecutionAction } from "@/app/consultoria/[slug]/treinos/actions";

export interface StudentWorkoutRestartModalProps {
  isOpen: boolean;
  onClose: () => void;
  consultancySlug: string;
  assignmentPublicId: string;
  blockPublicId?: string | null;
  divisionTitle: string;
  startedFormatted?: string;
  onSuccess: (targetBlockPublicId: string | null) => void;
}

export function StudentWorkoutRestartModal({
  isOpen,
  onClose,
  consultancySlug,
  assignmentPublicId,
  blockPublicId,
  divisionTitle,
  startedFormatted,
  onSuccess,
}: StudentWorkoutRestartModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleClose = useCallback(() => {
    if (isSubmitting) return; // Previne fechar durante a requisição
    onClose();
  }, [isSubmitting, onClose]);

  // Escape fecha se não estiver enviando
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSubmitting) {
        e.preventDefault();
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSubmitting, handleClose]);

  if (!isOpen) return null;

  async function handleConfirmRestart() {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await startOrResumeWorkoutExecutionAction(
        consultancySlug,
        assignmentPublicId,
        blockPublicId,
        { resolveConflict: "ABANDON" }
      );

      if (res.success) {
        onSuccess(blockPublicId ?? null);
        onClose();
      } else {
        setErrorMessage(
          res.error || "Não foi possível reiniciar a sessão de treino. Tente novamente."
        );
        setIsSubmitting(false);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao reiniciar treino.";
      setErrorMessage(msg);
      setIsSubmitting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="restart-modal-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs select-none"
      onClick={handleClose}
    >
      <div
        className="w-full sm:max-w-md bg-white dark:bg-[#151619] border border-zinc-200 dark:border-[#303238] rounded-t-3xl sm:rounded-2xl shadow-2xl p-5 sm:p-6 space-y-4 max-h-[90vh] flex flex-col transition-all text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="flex items-start justify-between gap-3 border-b border-zinc-100 dark:border-[#303238] pb-3 shrink-0">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 block mb-0.5">
              Reiniciar Execução
            </span>
            <h2
              id="restart-modal-title"
              className="text-base sm:text-lg font-black text-zinc-900 dark:text-white tracking-tight"
            >
              Começar do início?
            </h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            aria-label="Fechar"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        {/* Mensagem e Confirmação */}
        <div className="space-y-3 text-xs sm:text-sm text-zinc-700 dark:text-zinc-300">
          <p className="leading-relaxed">
            Deseja começar a divisão{" "}
            <strong className="text-zinc-900 dark:text-white font-bold">
              {divisionTitle}
            </strong>{" "}
            do início?
          </p>

          <div className="p-3 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/5 border border-emerald-500/25 text-xs text-emerald-900 dark:text-emerald-300 space-y-1">
            <span className="font-bold flex items-center gap-1.5">
              <span>✓</span>
              <span>Histórico preservado com segurança</span>
            </span>
            <p className="text-[11px] text-emerald-800/90 dark:text-emerald-300/80 leading-relaxed">
              {startedFormatted
                ? `O progresso anterior da sessão iniciada em ${startedFormatted} continuará salvo no seu histórico.`
                : "O progresso anterior continuará salvo com segurança no seu histórico."}
            </p>
          </div>

          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
            Uma nova sessão será iniciada a partir do primeiro exercício para que você realize o treino completo.
          </p>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-xs text-red-700 dark:text-red-300 font-medium">
              {errorMessage}
            </div>
          )}
        </div>

        {/* Ações com min-h de 44px */}
        <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-zinc-100 dark:border-[#303238]">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleClose}
            className="flex-1 min-h-[44px] px-4 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs sm:text-sm font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer disabled:opacity-50 select-none"
          >
            Cancelar
          </button>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleConfirmRestart}
            className="flex-1 min-h-[44px] px-4 rounded-xl bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white font-bold text-xs sm:text-sm shadow-xs flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50 select-none"
          >
            {isSubmitting ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Reiniciando...</span>
              </>
            ) : (
              <span>Começar do início</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
