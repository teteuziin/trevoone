"use client";

import React, { useState, useEffect, useCallback } from "react";
import { completeWorkoutExecutionAction } from "@/app/consultoria/[slug]/treinos/actions";

export interface StudentWorkoutCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  consultancySlug: string;
  sessionPublicId: string;
  divisionTitle: string;
  startedFormatted?: string;
  totalExercisesCount: number;
  completedExercisesCount: number;
  totalSetsCount?: number;
  completedSetsCount?: number;
  onSuccess: () => void;
}

export function StudentWorkoutCompletionModal({
  isOpen,
  onClose,
  consultancySlug,
  sessionPublicId,
  divisionTitle,
  startedFormatted,
  totalExercisesCount,
  completedExercisesCount,
  totalSetsCount = 0,
  completedSetsCount = 0,
  onSuccess,
}: StudentWorkoutCompletionModalProps) {
  const isAllDone =
    (totalSetsCount > 0 && completedSetsCount >= totalSetsCount) ||
    (totalExercisesCount > 0 && completedExercisesCount >= totalExercisesCount);

  const [completionState, setCompletionState] = useState<"ALL" | "PARTIAL" | "NONE">(
    isAllDone ? "ALL" : "PARTIAL"
  );
  const [studentNotes, setStudentNotes] = useState("");
  const [hasDiscomfort, setHasDiscomfort] = useState(false);
  const [discomfortNotes, setDiscomfortNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccessConfirmed, setIsSuccessConfirmed] = useState(false);

  const handleClose = useCallback(() => {
    if (isSubmitting) return; // Previne fechar no meio da submissão
    onClose();
  }, [isSubmitting, onClose]);

  // Teclado: Escape fecha o modal se não estiver gravando
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    const fullFeedback = [
      studentNotes.trim(),
      hasDiscomfort && discomfortNotes.trim()
        ? `[Desconforto relatado: ${discomfortNotes.trim()}]`
        : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    try {
      const res = await completeWorkoutExecutionAction(
        consultancySlug,
        sessionPublicId,
        {
          allowEarlyCompletion: true,
          studentCompletionState: completionState,
          studentFeedbackNotes: fullFeedback || null,
        }
      );

      if (res.success) {
        setIsSuccessConfirmed(true);
        // Exibe breve confirmação visual e aciona o callback para recarregar o painel
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 700);
      } else {
        if (res.error?.includes("WORKOUT_EXECUTION_NO_SETS_PERFORMED")) {
          setErrorMessage(
            "Nenhuma série foi gravada nesta sessão. Para reiniciar o treino do zero, use a opção 'Começar do início'."
          );
        } else {
          setErrorMessage(res.error || "Não foi possível finalizar o treino. Tente novamente.");
        }
        setIsSubmitting(false);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao finalizar treino.";
      setErrorMessage(msg);
      setIsSubmitting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="completion-modal-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs select-none"
      onClick={handleClose}
    >
      <div
        className="w-full sm:max-w-lg bg-white dark:bg-[#151619] border border-zinc-200 dark:border-[#303238] rounded-t-3xl sm:rounded-2xl shadow-2xl p-5 sm:p-6 space-y-4 max-h-[92vh] flex flex-col transition-all text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="flex items-start justify-between gap-3 border-b border-zinc-100 dark:border-[#303238] pb-3 shrink-0">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block mb-0.5">
              Encerramento de Treino
            </span>
            <h2
              id="completion-modal-title"
              className="text-base sm:text-lg font-black text-zinc-900 dark:text-white tracking-tight"
            >
              Como foi o treino?
            </h2>
            <p className="text-xs text-zinc-600 dark:text-[#8E95A2] mt-0.5">
              Divisão: <strong className="text-zinc-800 dark:text-zinc-200">{divisionTitle}</strong>
              {startedFormatted && (
                <span className="ml-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                  • {startedFormatted}
                </span>
              )}
            </p>
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

        {/* Sucesso Confirmado pelo Servidor */}
        {isSuccessConfirmed ? (
          <div className="py-8 text-center space-y-3 animate-in fade-in duration-200">
            <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 text-2xl font-bold">
              ✓
            </div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-white">
              Treino finalizado com sucesso!
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Atualizando o seu painel...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto pr-1 flex-1 py-1">
            {/* Resumo do Progresso */}
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-[#1B1D21] border border-zinc-200/80 dark:border-[#303238] text-xs space-y-1">
              <div className="flex items-center justify-between text-zinc-700 dark:text-zinc-300 font-semibold">
                <span>Progresso realizado:</span>
                <span className="text-emerald-700 dark:text-emerald-400">
                  {completedExercisesCount} de {totalExercisesCount}{" "}
                  {totalExercisesCount === 1 ? "exercício" : "exercícios"}
                </span>
              </div>
              {totalSetsCount > 0 && (
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  {completedSetsCount} de {totalSetsCount} séries registradas. Séries não realizadas serão finalizadas sem inventar cargas.
                </p>
              )}
            </div>

            {/* Pergunta: Conseguiu realizar tudo? */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200 block">
                Conseguiu realizar tudo?
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: "ALL" as const, label: "Sim, tudo" },
                  { value: "PARTIAL" as const, label: "Fiz parte" },
                  { value: "NONE" as const, label: "Não consegui" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => setCompletionState(opt.value)}
                    className={`py-2.5 px-2 rounded-xl text-xs font-bold transition-all border cursor-pointer select-none ${
                      completionState === opt.value
                        ? "bg-emerald-500/15 border-emerald-500 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/30"
                        : "bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white"
                    } disabled:opacity-50`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Alerta de Inconsistência Amigável */}
            {completionState === "ALL" &&
              totalExercisesCount > 0 &&
              completedExercisesCount < totalExercisesCount && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-900 dark:text-amber-200 space-y-1">
                  <span className="font-bold block">
                    Atenção: restam {totalExercisesCount - completedExercisesCount} exercício(s) pendente(s).
                  </span>
                  <p className="text-[11px] text-amber-900/80 dark:text-amber-300/80 leading-relaxed">
                    Você pode confirmar agora mesmo ou voltar para marcá-los. Seu personal receberá o resumo fiel da sessão.
                  </p>
                </div>
              )}

            {/* Observações / Dúvidas para o Treinador */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200 block">
                Dúvidas ou observações para seu personal (opcional)
              </label>
              <textarea
                rows={3}
                placeholder="Conte como se sentiu, o que foi difícil ou se tem alguma dúvida..."
                value={studentNotes}
                disabled={isSubmitting}
                onChange={(e) => setStudentNotes(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-xs sm:text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 resize-none disabled:opacity-50"
              />
            </div>

            {/* Relato Opcional de Desconforto/Dor */}
            <div className="space-y-2 pt-1 border-t border-zinc-100 dark:border-[#303238]">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white select-none">
                <input
                  type="checkbox"
                  checked={hasDiscomfort}
                  disabled={isSubmitting}
                  onChange={(e) => setHasDiscomfort(e.target.checked)}
                  className="rounded border-zinc-300 dark:border-zinc-600 text-emerald-600 focus:ring-emerald-500"
                />
                <span>Senti algum desconforto ou dor durante o treino</span>
              </label>

              {hasDiscomfort && (
                <input
                  type="text"
                  placeholder="Ex: Leve desconforto no ombro direito..."
                  value={discomfortNotes}
                  disabled={isSubmitting}
                  onChange={(e) => setDiscomfortNotes(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:opacity-50"
                />
              )}
            </div>

            {/* Mensagem de Erro Sanitizada */}
            {errorMessage && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-xs text-red-700 dark:text-red-300 font-medium">
                {errorMessage}
              </div>
            )}

            {/* Ações do Rodapé com Touch Target >= 44px */}
            <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-zinc-100 dark:border-[#303238]">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleClose}
                className="flex-1 min-h-[44px] px-4 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs sm:text-sm font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer disabled:opacity-50"
              >
                Voltar
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 min-h-[44px] px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-xs flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50 select-none"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Finalizando...</span>
                  </>
                ) : (
                  <span>Confirmar finalização</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
