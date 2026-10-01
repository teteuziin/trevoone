"use client";

import React, { useState } from "react";
import {
  requestExerciseAlternativesAction,
  confirmExerciseSubstitutionAction,
} from "@/app/consultoria/[slug]/treinos/actions";
import type {
  ExerciseSwapReason,
  ExerciseSwapAlternative,
} from "@/lib/training-v2/exercise-substitution-types";
import { SWAP_REASON_LABELS } from "@/lib/training-v2/exercise-substitution-types";
import type { WorkoutBlockItemDto, BlockItemMediaDto } from "@/lib/training-v2/types";

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

export function StudentExerciseSwapModal({
  isOpen,
  onClose,
  consultancySlug,
  sessionPublicId,
  item,
  currentExerciseName,
  remainingSwaps,
  onSwapConfirmed,
  onSkipExercise,
}: StudentExerciseSwapModalProps) {
  const [step, setStep] = useState<"SELECT_REASON" | "LOADING" | "SHOW_ALTERNATIVES" | "NO_ALTERNATIVES">("SELECT_REASON");
  const [selectedReason, setSelectedReason] = useState<ExerciseSwapReason>("MACHINE_OCCUPIED");
  const [alternatives, setAlternatives] = useState<ExerciseSwapAlternative[]>([]);
  const [previewMediaAlternativeId, setPreviewMediaAlternativeId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmedId, setConfirmedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSearchAlternatives = async (reasonToUse: ExerciseSwapReason) => {
    setSelectedReason(reasonToUse);
    setStep("LOADING");
    setErrorMessage(null);

    const res = await requestExerciseAlternativesAction(
      consultancySlug,
      sessionPublicId,
      item.publicId,
      reasonToUse
    );

    if (!res.success) {
      setErrorMessage(res.error || "Não foi possível carregar alternativas de substituição.");
      setStep("SELECT_REASON");
      return;
    }

    if (res.alternatives && res.alternatives.length > 0) {
      setAlternatives(res.alternatives);
      setStep("SHOW_ALTERNATIVES");
    } else {
      setStep("NO_ALTERNATIVES");
    }
  };

  const handleConfirmSwap = async (alt: ExerciseSwapAlternative) => {
    setIsConfirming(true);
    setConfirmedId(alt.exercisePublicId);
    setErrorMessage(null);

    const idempotencyKey = crypto.randomUUID();

    const res = await confirmExerciseSubstitutionAction(
      consultancySlug,
      sessionPublicId,
      item.publicId,
      alt.exercisePublicId,
      selectedReason,
      idempotencyKey
    );

    setIsConfirming(false);

    if (!res.success) {
      setErrorMessage(res.error || "Erro ao confirmar substituição de exercício.");
      return;
    }

    onSwapConfirmed({
      performedExercisePublicId: alt.exercisePublicId,
      performedExerciseName: alt.name,
      reason: selectedReason,
      reasonLabel: SWAP_REASON_LABELS[selectedReason],
      pinnedMedia: alt.pinnedMedia,
      remainingSwaps: res.remainingSwaps ?? Math.max(0, remainingSwaps - 1),
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--surface-subtle)]/40 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base sm:text-lg">↔</span>
              <h3 className="font-heading font-extrabold text-sm sm:text-base text-[var(--foreground)]">
                Substituir Exercício
              </h3>
            </div>
            <p className="text-xs text-[var(--foreground-muted)] truncate max-w-xs mt-0.5">
              Prescrito: <strong className="text-[var(--foreground)]">{currentExerciseName}</strong>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
              {remainingSwaps} {remainingSwaps === 1 ? "troca disponível" : "trocas disponíveis"}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="text-[var(--foreground-muted)] hover:text-[var(--foreground)] p-1 rounded-lg transition-colors cursor-pointer"
              aria-label="Fechar modal"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-medium">
              {errorMessage}
            </div>
          )}

          {/* STEP 1: SELECT REASON */}
          {step === "SELECT_REASON" && (
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-[var(--foreground)]">
                  Qual o motivo da substituição?
                </p>
                <p className="text-[11px] text-[var(--foreground-muted)] mt-0.5">
                  A IA e o motor inteligente do Trevo buscarão alternativas que não dependam do mesmo equipamento.
                </p>
              </div>

              <div className="space-y-2">
                {(
                  [
                    "MACHINE_OCCUPIED",
                    "EQUIPMENT_BROKEN",
                    "EQUIPMENT_UNAVAILABLE",
                    "OTHER_OPERATIONAL",
                  ] as ExerciseSwapReason[]
                ).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => handleSearchAlternatives(r)}
                    className="w-full text-left p-3.5 rounded-xl border border-[var(--border-subtle)] hover:border-emerald-500/50 bg-[var(--surface-subtle)]/60 hover:bg-emerald-500/5 transition-all text-xs font-semibold text-[var(--foreground)] flex items-center justify-between group cursor-pointer"
                  >
                    <span>{SWAP_REASON_LABELS[r]}</span>
                    <span className="text-[var(--foreground-muted)] group-hover:text-emerald-500 transition-colors">
                      →
                    </span>
                  </button>
                ))}
              </div>

              <p className="text-[10px] text-[var(--foreground-muted)] italic">
                * A substituição vale exclusivamente para esta sessão de treino. A prescrição original do seu Personal Trainer não é alterada.
              </p>
            </div>
          )}

          {/* STEP 2: LOADING */}
          {step === "LOADING" && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
              <div className="relative w-12 h-12">
                <div className="absolute inset-0 rounded-full border-4 border-emerald-500/20 animate-ping" />
                <div className="w-12 h-12 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
              </div>
              <p className="text-xs font-bold text-[var(--foreground)]">
                Buscando alternativas equivalentes...
              </p>
              <p className="text-[11px] text-[var(--foreground-muted)] max-w-xs">
                Filtrando biomecânica, grupo muscular e excluindo equipamento indisponível.
              </p>
            </div>
          )}

          {/* STEP 3: SHOW ALTERNATIVES */}
          {step === "SHOW_ALTERNATIVES" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-[var(--foreground)]">
                  Alternativas para {currentExerciseName}:
                </p>
                <button
                  type="button"
                  onClick={() => setStep("SELECT_REASON")}
                  className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                >
                  Trocar motivo
                </button>
              </div>

              <div className="space-y-3">
                {alternatives.map((alt, idx) => {
                  const isPreviewing = previewMediaAlternativeId === alt.exercisePublicId;
                  const executionVideo = alt.pinnedMedia.find((m) => m.role === "EXECUTION_VIDEO");
                  const fallbackImage = alt.pinnedMedia.find((m) => m.role === "START_IMAGE" || m.role === "VIDEO_POSTER" || m.role === "ALTERNATE_IMAGE");
                  const previewMedia = executionVideo || fallbackImage || alt.pinnedMedia[0];

                  return (
                    <div
                      key={alt.exercisePublicId}
                      className="p-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)]/50 hover:border-emerald-500/30 transition-all space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="w-4 h-4 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <h4 className="font-bold text-xs text-[var(--foreground)] truncate">
                              {alt.name}
                            </h4>
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            {alt.muscleGroupPrimary && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[var(--surface)] text-[var(--foreground-muted)] border border-[var(--border-subtle)]">
                                {alt.muscleGroupPrimary}
                              </span>
                            )}
                            {alt.equipment && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[var(--surface)] text-[var(--foreground-muted)] border border-[var(--border-subtle)]">
                                {alt.equipment}
                              </span>
                            )}
                          </div>
                        </div>

                        {previewMedia && (
                          <button
                            type="button"
                            onClick={() =>
                              setPreviewMediaAlternativeId(
                                isPreviewing ? null : alt.exercisePublicId
                              )
                            }
                            className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/5 hover:bg-emerald-500/10 transition-colors cursor-pointer"
                          >
                            <span>▶</span>
                            <span>{isPreviewing ? "Ocultar" : "Ver execução"}</span>
                          </button>
                        )}
                      </div>

                      {/* Lazy-loaded Execution Media Preview */}
                      {isPreviewing && previewMedia && (
                        <div className="rounded-xl overflow-hidden border border-[var(--border-subtle)] bg-black p-1 max-h-48 flex items-center justify-center animate-in fade-in duration-150">
                          {previewMedia.mediaAsset.mediaType === "VIDEO" ||
                          previewMedia.mediaAsset.mimeType === "video/mp4" ? (
                            <video
                              autoPlay
                              loop
                              muted
                              playsInline
                              controls
                              preload="metadata"
                              src={`/api/training-v2/media/${previewMedia.mediaAsset.publicId}`}
                              className="max-h-44 w-auto object-contain rounded mx-auto block"
                            />
                          ) : (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={`/api/training-v2/media/${previewMedia.mediaAsset.publicId}`}
                              alt={alt.name}
                              className="max-h-44 w-auto object-contain rounded mx-auto block"
                            />
                          )}
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-1 border-t border-[var(--border-subtle)]/60 gap-2">
                        <p className="text-[10px] text-[var(--foreground-muted)] truncate">
                          {alt.explanation || "Exercício equivalente compatível."}
                        </p>

                        <button
                          type="button"
                          disabled={isConfirming}
                          onClick={() => handleConfirmSwap(alt)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs shrink-0 transition-colors shadow-xs cursor-pointer"
                        >
                          {isConfirming && confirmedId === alt.exercisePublicId
                            ? "Confirmando..."
                            : "Substituir por este"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 4: NO SAFE ALTERNATIVES FOUND */}
          {step === "NO_ALTERNATIVES" && (
            <div className="py-8 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 mx-auto flex items-center justify-center text-xl font-bold">
                ⚠️
              </div>
              <div className="space-y-1">
                <p className="text-xs sm:text-sm font-bold text-[var(--foreground)]">
                  Não encontramos uma substituição segura para este exercício.
                </p>
                <p className="text-[11px] text-[var(--foreground-muted)] max-w-sm mx-auto">
                  Para preservar sua segurança e os objetivos do treino, recomendamos continuar o exercício original quando a máquina liberar ou pular este item.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] hover:bg-[var(--surface)] text-xs font-semibold text-[var(--foreground)] cursor-pointer"
                >
                  Continuar exercício
                </button>
                {onSkipExercise && (
                  <button
                    type="button"
                    onClick={() => {
                      onSkipExercise();
                      onClose();
                    }}
                    className="px-4 py-2 rounded-xl bg-neutral-500/10 hover:bg-neutral-500/20 text-xs font-semibold text-[var(--foreground)] cursor-pointer"
                  >
                    Pular exercício
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[var(--border-subtle)] bg-[var(--surface-subtle)]/20 flex items-center justify-between text-xs shrink-0">
          <span className="text-[11px] text-[var(--foreground-muted)]">
            Máximo de 3 substituições por treino.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] hover:bg-[var(--surface-subtle)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] font-medium text-xs transition-colors cursor-pointer"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
