"use client";

import React, { useState } from "react";
import { confirmExerciseSubstitutionAction } from "@/app/consultoria/[slug]/treinos/actions";
import type { ExerciseSwapReason } from "@/lib/training-v2/exercise-substitution-types";
import { SWAP_REASON_LABELS } from "@/lib/training-v2/exercise-substitution-types";
import type {
  WorkoutBlockItemDto,
  WorkoutBlockItemAlternativeDto,
  BlockItemMediaDto,
} from "@/lib/training-v2/types";

interface StudentExerciseSwapModalProps {
  isOpen: boolean;
  onClose: () => void;
  consultancySlug: string;
  sessionPublicId: string;
  item: WorkoutBlockItemDto;
  currentExerciseName: string;
  remainingSwaps: number;
  onSwapConfirmed: (data: {
    performedExercisePublicId: string;
    performedExerciseName: string;
    reason: ExerciseSwapReason;
    reasonLabel: string;
    pinnedMedia: BlockItemMediaDto[];
    remainingSwaps: number;
  }) => void;
  onSkipExercise?: () => void;
}

function XIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function RepeatIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}

export function StudentExerciseSwapModal({
  isOpen,
  onClose,
  consultancySlug,
  sessionPublicId,
  item,
  currentExerciseName,
  remainingSwaps,
  onSwapConfirmed,
}: StudentExerciseSwapModalProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmedId, setConfirmedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const prescribedAlternatives: WorkoutBlockItemAlternativeDto[] = item.alternatives || [];
  const hasAlternatives = prescribedAlternatives.length > 0;

  const handleConfirmPrescribedSwap = async (alt: WorkoutBlockItemAlternativeDto) => {
    setIsConfirming(true);
    setConfirmedId(alt.id);
    setErrorMessage(null);

    const idempotencyKey = crypto.randomUUID();
    const targetPublicId = alt.exercisePublicId || alt.id;
    const defaultReason: ExerciseSwapReason = "OTHER_OPERATIONAL";

    const res = await confirmExerciseSubstitutionAction(
      consultancySlug,
      sessionPublicId,
      item.publicId,
      targetPublicId,
      defaultReason,
      idempotencyKey
    );

    setIsConfirming(false);

    if (!res.success) {
      setErrorMessage(res.error || "Erro ao confirmar substituição de exercício.");
      return;
    }

    onSwapConfirmed({
      performedExercisePublicId: targetPublicId,
      performedExerciseName: alt.exerciseName,
      reason: defaultReason,
      reasonLabel: SWAP_REASON_LABELS[defaultReason],
      pinnedMedia: [],
      remainingSwaps: res.remainingSwaps ?? Math.max(0, remainingSwaps - 1),
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[var(--surface-elevated)] border border-[var(--border-default)] rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--surface-subtle)]/40 shrink-0">
          <div className="min-w-0 pr-3">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
              Substituição de Exercício
            </span>
            <h3 className="text-base font-extrabold text-[var(--text-primary)] truncate">
              {currentExerciseName || item.exerciseNameSnapshot}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
            aria-label="Fechar"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/25 text-red-600 dark:text-red-400 text-xs font-semibold">
              {errorMessage}
            </div>
          )}

          {!hasAlternatives ? (
            <div className="py-8 px-4 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center mx-auto">
                <RepeatIcon className="w-7 h-7" />
              </div>
              <div className="space-y-1.5">
                <h4 className="text-base font-extrabold text-[var(--text-primary)]">
                  Nenhuma alternativa disponível
                </h4>
                <p className="text-xs sm:text-sm text-[var(--text-secondary)] max-w-xs mx-auto leading-relaxed">
                  Seu personal não cadastrou alternativas para este exercício.
                </p>
              </div>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-3 px-4 rounded-xl bg-[var(--surface-subtle)] hover:bg-[var(--surface)] border border-[var(--border-default)] text-xs font-bold text-[var(--text-primary)] transition-colors min-h-[44px] cursor-pointer"
                >
                  Voltar ao treino
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-[var(--text-secondary)] font-medium">
                Escolha uma das alternativas autorizadas pelo seu personal para este exercício:
              </p>

              <div className="space-y-3">
                {prescribedAlternatives.map((alt) => (
                  <div
                    key={alt.id}
                    className="p-4 rounded-2xl border border-[var(--border-default)] bg-[var(--surface-subtle)] space-y-3"
                  >
                    <div>
                      <h4 className="text-sm font-extrabold text-[var(--text-primary)]">
                        {alt.exerciseName}
                      </h4>
                      {(alt.muscleGroup || alt.equipment) && (
                        <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                          {[alt.muscleGroup, alt.equipment].filter(Boolean).join(" • ")}
                        </p>
                      )}
                    </div>

                    {/* Prescribed parameters */}
                    <div className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5 flex-wrap bg-[var(--surface-elevated)] p-2 rounded-xl border border-[var(--border-subtle)]">
                      <span>Prescrição:</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                        {alt.targetRepsMax && alt.targetRepsMax !== alt.targetReps
                          ? `${alt.targetReps}–${alt.targetRepsMax} reps`
                          : alt.targetReps ? `${alt.targetReps} reps` : "Reps livres"}
                      </span>
                      {alt.targetLoadKg != null && (
                        <span>• {alt.targetLoadKg} kg</span>
                      )}
                      {alt.targetRestSeconds != null && (
                        <span>• {alt.targetRestSeconds}s descanso</span>
                      )}
                    </div>

                    {alt.notes && (
                      <p className="text-[11px] font-semibold text-amber-800 dark:text-amber-300 bg-amber-500/10 border border-amber-500/25 px-2.5 py-1 rounded-lg">
                        ⚡ {alt.notes}
                      </p>
                    )}

                    <button
                      type="button"
                      disabled={isConfirming}
                      onClick={() => handleConfirmPrescribedSwap(alt)}
                      className="w-full mt-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-extrabold text-xs transition-all min-h-[44px] flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-[0.99]"
                    >
                      {isConfirming && confirmedId === alt.id ? (
                        <span>Confirmando substituição...</span>
                      ) : (
                        <span>Substituir por este</span>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {hasAlternatives && (
          <div className="px-5 py-3 border-t border-[var(--border-subtle)] bg-[var(--surface-subtle)]/30 flex justify-end shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isConfirming}
              className="px-4 py-2 rounded-xl border border-[var(--border-default)] hover:bg-[var(--surface-subtle)] text-xs font-semibold text-[var(--text-primary)] transition-colors min-h-[40px] cursor-pointer"
            >
              Cancelar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
