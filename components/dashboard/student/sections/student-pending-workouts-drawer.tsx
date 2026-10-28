"use client";

import React, { useEffect, useRef } from "react";
import Link from "next/link";
import { SessionMoreOptionsMenu } from "./session-more-options-menu";

export interface PendingWorkoutItem {
  sessionPublicId: string;
  assignmentPublicId: string;
  blockPublicId?: string | null;
  divisionTitle: string;
  startedFormatted?: string;
  totalExercisesCount: number;
  completedExercisesCount: number;
  totalSetsCount: number;
  completedSetsCount: number;
  actionHref: string;
}

export interface StudentPendingWorkoutsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  pendingSession: PendingWorkoutItem | null;
  onOpenCompletion: () => void;
  onOpenRestart: () => void;
  triggerRef?: React.RefObject<HTMLButtonElement | null>;
}

export function StudentPendingWorkoutsDrawer({
  isOpen,
  onClose,
  pendingSession,
  onOpenCompletion,
  onOpenRestart,
  triggerRef,
}: StudentPendingWorkoutsDrawerProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Focus trap e Escape key handling
  useEffect(() => {
    if (!isOpen) return;

    // Foca o botão de fechar ao abrir
    const timer = setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        triggerRef?.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose, triggerRef]);

  if (!isOpen || !pendingSession) return null;

  const isAllDone = Boolean(
    (pendingSession.totalSetsCount > 0 &&
      pendingSession.completedSetsCount >= pendingSession.totalSetsCount) ||
      (pendingSession.totalExercisesCount > 0 &&
        pendingSession.completedExercisesCount >= pendingSession.totalExercisesCount)
  );

  const handleClose = () => {
    onClose();
    triggerRef?.current?.focus();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pending-workouts-title"
      className="fixed inset-0 z-50 flex justify-end"
    >
      {/* Backdrop transparente / escurecido */}
      <div
        onClick={handleClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        aria-hidden="true"
      />

      {/* Drawer no Desktop / Bottom Sheet no Mobile */}
      <div
        ref={drawerRef}
        className="relative z-10 w-full sm:max-w-md h-auto max-h-[88vh] sm:max-h-full sm:h-full bg-white dark:bg-[#151619] border-t sm:border-t-0 sm:border-l border-zinc-200 dark:border-[#303238] shadow-2xl rounded-t-3xl sm:rounded-none flex flex-col animate-in slide-in-from-bottom sm:slide-in-from-right duration-300 self-end sm:self-auto overflow-hidden"
      >
        {/* Cabeçalho do Painel */}
        <div className="p-5 sm:p-6 border-b border-zinc-200 dark:border-[#303238] flex items-center justify-between gap-3 shrink-0">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
              <h2
                id="pending-workouts-title"
                className="text-lg sm:text-xl font-bold tracking-tight text-zinc-900 dark:text-white"
              >
                Treinos pendentes
              </h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30">
                1
              </span>
            </div>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-[#8E95A2]">
              Sessões anteriores iniciadas que ainda não foram finalizadas.
            </p>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={handleClose}
            aria-label="Fechar painel de treinos pendentes"
            className="w-10 h-10 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <span className="text-lg font-bold leading-none">✕</span>
          </button>
        </div>

        {/* Conteúdo com scroll */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 text-left">
          <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/8 dark:bg-amber-500/5 border border-amber-500/25 space-y-3.5">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                <span className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                  Treino não finalizado
                </span>
              </div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white tracking-tight leading-snug">
                {pendingSession.divisionTitle}
              </h3>
              {pendingSession.startedFormatted && (
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Iniciado em {pendingSession.startedFormatted}
                </p>
              )}
            </div>

            {/* Progresso simplificado */}
            <div className="text-base font-medium text-zinc-800 dark:text-zinc-200">
              {isAllDone ? (
                <span className="inline-flex items-center gap-1.5 text-purple-700 dark:text-purple-300 font-semibold">
                  <span>✓</span>
                  <span>Todas as séries concluídas. Falta finalizar o treino.</span>
                </span>
              ) : (
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="text-base font-medium text-zinc-900 dark:text-zinc-100">
                    {pendingSession.completedExercisesCount} de {pendingSession.totalExercisesCount}{" "}
                    {pendingSession.totalExercisesCount === 1 ? "exercício concluído" : "exercícios concluídos"}
                  </span>
                  {pendingSession.totalSetsCount > 0 && (
                    <span className="text-sm text-zinc-500 dark:text-zinc-400">
                      (Séries: {pendingSession.completedSetsCount} de {pendingSession.totalSetsCount})
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Ações da Sessão com Semântica Estrita */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-3 border-t border-amber-500/20">
              {isAllDone ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      handleClose();
                      onOpenCompletion();
                    }}
                    className="w-full sm:w-auto px-5 min-h-[48px] rounded-xl font-bold text-sm sm:text-base bg-purple-600 hover:bg-purple-500 active:bg-purple-700 text-white flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs select-none"
                  >
                    <span>✓ Finalizar treino</span>
                  </button>
                  <Link
                    href={pendingSession.actionHref}
                    onClick={handleClose}
                    className="w-full sm:w-auto px-4 min-h-[48px] rounded-xl font-semibold text-sm bg-white dark:bg-[#151619] hover:bg-zinc-100 dark:hover:bg-[#252830] text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-center select-none"
                  >
                    <span>Ver treino</span>
                    <span>→</span>
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href={pendingSession.actionHref}
                    onClick={handleClose}
                    className="w-full sm:w-auto px-5 min-h-[48px] rounded-xl font-semibold text-sm sm:text-base bg-blue-600/10 hover:bg-blue-600/20 active:bg-blue-600/30 text-blue-700 dark:text-blue-300 border border-blue-500/30 flex items-center justify-center gap-2 transition-colors cursor-pointer select-none"
                  >
                    <span>Continuar treino</span>
                    <span>→</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      handleClose();
                      onOpenCompletion();
                    }}
                    className="w-full sm:w-auto px-4 min-h-[48px] rounded-xl font-semibold text-sm bg-purple-600/10 hover:bg-purple-600/20 active:bg-purple-600/30 text-purple-700 dark:text-purple-300 border border-purple-500/30 flex items-center justify-center gap-1.5 transition-colors cursor-pointer select-none"
                  >
                    <span>Finalizar treino</span>
                  </button>
                </>
              )}

              <SessionMoreOptionsMenu
                onRestart={() => {
                  handleClose();
                  onOpenRestart();
                }}
              />
            </div>
          </div>
        </div>

        {/* Rodapé discreto */}
        <div className="p-4 bg-zinc-50 dark:bg-[#1B1D21] border-t border-zinc-200 dark:border-[#303238] text-center text-xs text-zinc-500 dark:text-[#8E95A2]">
          Abrir ou fechar este painel não altera dados nem inicia sessões.
        </div>
      </div>
    </div>
  );
}
