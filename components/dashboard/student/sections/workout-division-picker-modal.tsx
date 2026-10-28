"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { DailyWorkoutDivisionOption } from "@/lib/training-v2/daily-workout-resolver";
import { buildStudentWorkoutExecutionUrl } from "@/lib/training-v2/route-helpers";

export interface WorkoutDivisionPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  consultancySlug: string;
  assignmentPublicId: string;
  divisions: DailyWorkoutDivisionOption[];
  currentDivisionPublicId?: string | null;
  hasActiveSession?: boolean;
  onSelectDivision?: (publicId: string) => void;
}

export function WorkoutDivisionPickerModal({
  isOpen,
  onClose,
  consultancySlug,
  assignmentPublicId,
  divisions,
  currentDivisionPublicId,
  hasActiveSession = false,
  onSelectDivision,
}: WorkoutDivisionPickerModalProps) {
  const router = useRouter();
  const [overridePublicId, setOverridePublicId] = useState<string | null>(null);

  const selectedPublicId =
    overridePublicId ?? currentDivisionPublicId ?? divisions[0]?.publicId ?? "";

  const handleClose = useCallback(() => {
    setOverridePublicId(null);
    onClose();
  }, [onClose]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!selectedPublicId) return;
    if (onSelectDivision) {
      onSelectDivision(selectedPublicId);
    }
    handleClose();
    // Navega para a página de execução com o parâmetro de query bloco selecionado
    router.push(
      buildStudentWorkoutExecutionUrl(consultancySlug, assignmentPublicId, selectedPublicId)
    );
  };

  const getStatusBadge = (status: DailyWorkoutDivisionOption["status"]) => {
    switch (status) {
      case "IN_PROGRESS":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            Em andamento
          </span>
        );
      case "SCHEDULED_TODAY":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Previsto para hoje
          </span>
        );
      case "COMPLETED_TODAY":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700">
            ✓ Realizado hoje
          </span>
        );
      case "PENDING_CYCLE":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            Próximo na sequência
          </span>
        );
      case "COMPLETED_CYCLE":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-zinc-100 dark:bg-zinc-800/60 text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700/60">
            Concluído no ciclo
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs select-none"
      onClick={handleClose}
    >
      <div
        className="w-full sm:max-w-lg bg-white dark:bg-[#151619] border border-zinc-200 dark:border-[#303238] rounded-t-3xl sm:rounded-2xl shadow-2xl p-5 sm:p-6 space-y-5 max-h-[90vh] flex flex-col transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="flex items-start justify-between gap-3 border-b border-zinc-100 dark:border-[#303238] pb-4 shrink-0">
          <div>
            <h2 id="modal-title" className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white">
              Escolher divisão de treino
            </h2>
            <p className="text-xs text-zinc-500 dark:text-[#8E95A2] mt-0.5">
              Selecione qual divisão você deseja treinar nesta sessão.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Fechar"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Mensagem de Política de Troca */}
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-medium text-emerald-800 dark:text-emerald-300 shrink-0">
          <p>ℹ️ A troca vale para esta sessão. Sua programação dos demais dias será mantida.</p>
          {hasActiveSession && (
            <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-1">
              Suas séries já realizadas continuam registradas e salvas com segurança no histórico.
            </p>
          )}
        </div>

        {/* Lista de Divisões Disponíveis com Scroll */}
        <div className="space-y-2.5 overflow-y-auto pr-1 flex-1 py-1">
          {divisions.map((div) => {
            const isSelected = selectedPublicId === div.publicId;
            return (
              <div
                key={div.publicId}
                onClick={() => setOverridePublicId(div.publicId)}
                role="radio"
                aria-checked={isSelected}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === " " || e.key === "Enter") {
                    e.preventDefault();
                    setOverridePublicId(div.publicId);
                  }
                }}
                className={`p-3.5 sm:p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  isSelected
                    ? "bg-emerald-500/10 dark:bg-emerald-500/15 border-emerald-500 text-zinc-900 dark:text-white ring-1 ring-emerald-500"
                    : "bg-zinc-50 dark:bg-[#1B1D21] border-zinc-200 dark:border-[#303238] hover:border-zinc-300 dark:hover:border-zinc-600 text-zinc-800 dark:text-zinc-200"
                }`}
              >
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm sm:text-base truncate">
                      {div.title}
                    </span>
                    {getStatusBadge(div.status)}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-[#8E95A2]">
                    <span>{div.exerciseCount} {div.exerciseCount === 1 ? "exercício" : "exercícios"}</span>
                    {div.scheduledDaysLabel && (
                      <>
                        <span>•</span>
                        <span>{div.scheduledDaysLabel}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Marcador de Seleção Circular */}
                <div
                  className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                    isSelected
                      ? "border-emerald-600 bg-emerald-600 text-white"
                      : "border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800"
                  }`}
                >
                  {isSelected && (
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Rodapé e Botões */}
        <div className="pt-3 border-t border-zinc-100 dark:border-[#303238] flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleClose}
            className="min-h-[44px] px-4 rounded-xl font-medium text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 bg-zinc-100 hover:bg-zinc-200 dark:bg-[#1B1D21] dark:hover:bg-[#252830] transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          {onSelectDivision && (
            <button
              type="button"
              onClick={() => {
                if (selectedPublicId) {
                  onSelectDivision(selectedPublicId);
                  handleClose();
                }
              }}
              className="min-h-[44px] px-4 rounded-xl font-semibold text-xs sm:text-sm text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 transition-colors cursor-pointer"
            >
              Selecionar no painel
            </button>
          )}
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!selectedPublicId}
            className="min-h-[44px] px-5 rounded-xl font-bold text-xs sm:text-sm bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 text-white shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Fazer este treino</span>
            <span>→</span>
          </button>
        </div>
      </div>
    </div>
  );
}
