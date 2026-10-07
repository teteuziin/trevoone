"use client";

import React, { useState, useEffect } from "react";
import {
  suggestSequenceMovementsAction,
  updateItemCustomSequenceAction,
  type SuggestedSequenceMovementDto,
} from "@/app/consultoria/[slug]/rotinas/actions";
import type { WorkoutBlockItemDto } from "@/lib/training-v2/types";

interface SequenceConfigurationModalProps {
  isOpen: boolean;
  onClose: () => void;
  consultancySlug: string;
  item: WorkoutBlockItemDto;
  detectedMovements: Array<{
    order: number;
    rawText: string;
    normalizedName: string;
    prescriptionHint?: {
      repsText?: string | null;
      durationText?: string | null;
    };
  }>;
  onSaved: (updatedItem: WorkoutBlockItemDto) => void;
}

export function SequenceConfigurationModal({
  isOpen,
  onClose,
  consultancySlug,
  item,
  detectedMovements,
  onSaved,
}: SequenceConfigurationModalProps) {
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // State for each movement's chosen assignment
  const [movementAssignments, setMovementAssignments] = useState<
    Array<{
      order: number;
      label: string;
      rawText: string;
      repsText: string | null;
      durationText: string | null;
      selectedPublicId: string | null;
      selectedName: string | null;
      hasVideo: boolean;
      isChanging: boolean;
      searchQuery: string;
      candidates: Array<{
        publicId: string;
        name: string;
        muscleGroup?: string | null;
        equipment?: string | null;
        hasVideo: boolean;
      }>;
    }>
  >([]);

  // Load suggestions from library on open
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const movementLabels = detectedMovements.map((m) => m.rawText || m.normalizedName);

    suggestSequenceMovementsAction(consultancySlug, movementLabels)
      .then((res) => {
        if (!isMounted) return;
        setIsLoadingSuggestions(false);
        if (res.ok && Array.isArray(res.data)) {
          const mapped = res.data.map((itemSug: SuggestedSequenceMovementDto, idx: number) => {
            const detected = detectedMovements[idx];
            return {
              order: idx + 1,
              label: detected?.normalizedName || itemSug.normalizedName,
              rawText: itemSug.rawText,
              repsText: detected?.prescriptionHint?.repsText || itemSug.repsText || null,
              durationText: detected?.prescriptionHint?.durationText || itemSug.durationText || null,
              selectedPublicId: itemSug.suggestedExercise?.publicId || null,
              selectedName: itemSug.suggestedExercise?.name || null,
              hasVideo: itemSug.suggestedExercise?.hasVideo ?? false,
              isChanging: false,
              searchQuery: "",
              candidates: itemSug.candidates || [],
            };
          });
          setMovementAssignments(mapped);
        } else {
          // Fallback if search fails
          setMovementAssignments(
            detectedMovements.map((m, idx) => ({
              order: idx + 1,
              label: m.normalizedName,
              rawText: m.rawText,
              repsText: m.prescriptionHint?.repsText || null,
              durationText: m.prescriptionHint?.durationText || null,
              selectedPublicId: null,
              selectedName: null,
              hasVideo: false,
              isChanging: false,
              searchQuery: "",
              candidates: [],
            }))
          );
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setIsLoadingSuggestions(false);
        setErrorMessage(err instanceof Error ? err.message : "Erro ao carregar sugestões.");
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, consultancySlug, detectedMovements]);

  if (!isOpen) return null;

  const handleConfirmSequence = async () => {
    try {
      setIsSaving(true);
      setErrorMessage(null);

      const movementsPayload = movementAssignments.map((m) => ({
        order: m.order,
        label: m.label,
        exercisePublicId: m.selectedPublicId || null,
        repsText: m.repsText || null,
        durationText: m.durationText || null,
      }));

      const res = await updateItemCustomSequenceAction(consultancySlug, {
        itemPublicId: item.publicId,
        isSequence: true,
        rawText: item.exerciseNameSnapshot,
        movements: movementsPayload,
      });

      if (!res.ok || !res.data) {
        throw new Error(res.error || "Erro ao salvar estrutura da sequência.");
      }

      onSaved(res.data);
      onClose();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Falha ao salvar sequência.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-[var(--surface)] border border-[var(--border-default)] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between gap-3 bg-[var(--surface-subtle)]/60">
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-600 dark:text-purple-400 block">
              ✨ Estruturação Assistida
            </span>
            <h3 className="text-base sm:text-lg font-extrabold text-[var(--text-primary)] font-heading leading-tight truncate">
              Sequência detectada
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="p-1.5 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)] transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Subtitle & Info */}
        <div className="px-5 pt-3 pb-2 text-xs text-[var(--text-secondary)] space-y-1">
          <p className="leading-relaxed">
            Confirme os movimentos para usar os vídeos da biblioteca automaticamente.
          </p>
          <div className="px-3 py-1.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-[11px] font-medium text-[var(--text-tertiary)] truncate">
            Texto original: <span className="text-[var(--text-primary)] font-semibold">{item.exerciseNameSnapshot}</span>
          </div>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="mx-5 my-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs">
            {errorMessage}
          </div>
        )}

        {/* Movements List */}
        <div className="p-5 space-y-3.5 overflow-y-auto flex-1">
          {isLoadingSuggestions ? (
            <div className="py-8 text-center space-y-2 text-[var(--text-tertiary)]">
              <span className="w-6 h-6 border-2 border-purple-500/30 border-t-purple-600 rounded-full animate-spin inline-block" />
              <p className="text-xs font-semibold">Localizando exercícios correspondentes na biblioteca...</p>
            </div>
          ) : (
            movementAssignments.map((mov, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-2.5"
              >
                {/* Movement Label & Hints */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-purple-600 text-white text-[11px] font-extrabold flex items-center justify-center shrink-0">
                      {mov.order}
                    </span>
                    <span className="text-xs sm:text-sm font-extrabold text-[var(--text-primary)]">
                      {mov.label}
                    </span>
                  </div>
                  {(mov.repsText || mov.durationText) && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20">
                      {mov.repsText || mov.durationText}
                    </span>
                  )}
                </div>

                {/* Association Box */}
                {!mov.isChanging ? (
                  <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border-default)]">
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-bold uppercase text-[var(--text-tertiary)] block">
                        Sugestão vinculada:
                      </span>
                      {mov.selectedName ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 truncate">
                            {mov.selectedName} ✓
                          </span>
                          {mov.hasVideo && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 font-bold shrink-0">
                              Vídeo
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs font-semibold text-[var(--text-secondary)] italic">
                          Nenhum exercício associado (execução textual)
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setMovementAssignments((prev) =>
                          prev.map((p, pIdx) => (pIdx === idx ? { ...p, isChanging: true } : p))
                        );
                      }}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-purple-700 dark:text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 transition-colors cursor-pointer shrink-0"
                    >
                      Trocar
                    </button>
                  </div>
                ) : (
                  /* Changing / Picking other candidate */
                  <div className="p-2.5 rounded-xl bg-[var(--surface)] border border-purple-500/30 space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-bold text-[var(--text-secondary)]">
                      <span>Escolher exercício da biblioteca:</span>
                      <button
                        type="button"
                        onClick={() => {
                          setMovementAssignments((prev) =>
                            prev.map((p, pIdx) => (pIdx === idx ? { ...p, isChanging: false } : p))
                          );
                        }}
                        className="text-[10px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] cursor-pointer"
                      >
                        Cancelar troca
                      </button>
                    </div>

                    {mov.candidates.length > 0 ? (
                      <div className="space-y-1.5 max-h-36 overflow-y-auto">
                        {mov.candidates.map((cand) => (
                          <div
                            key={cand.publicId}
                            onClick={() => {
                              setMovementAssignments((prev) =>
                                prev.map((p, pIdx) =>
                                  pIdx === idx
                                    ? {
                                        ...p,
                                        selectedPublicId: cand.publicId,
                                        selectedName: cand.name,
                                        hasVideo: cand.hasVideo,
                                        isChanging: false,
                                      }
                                    : p
                                )
                              );
                            }}
                            className="p-2 rounded-lg bg-[var(--surface-subtle)] hover:bg-purple-500/10 border border-[var(--border-subtle)] flex items-center justify-between text-xs cursor-pointer transition-colors"
                          >
                            <span className="font-semibold text-[var(--text-primary)] truncate">
                              {cand.name}
                            </span>
                            {cand.hasVideo && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700 font-bold shrink-0 ml-2">
                                Com vídeo
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-[var(--text-tertiary)] italic">
                        Nenhum candidato encontrado na biblioteca para este termo.
                      </p>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setMovementAssignments((prev) =>
                          prev.map((p, pIdx) =>
                            pIdx === idx
                              ? {
                                  ...p,
                                  selectedPublicId: null,
                                  selectedName: null,
                                  hasVideo: false,
                                  isChanging: false,
                                }
                              : p
                          )
                        );
                      }}
                      className="w-full py-1.5 text-center text-[11px] font-bold text-[var(--text-tertiary)] hover:text-[var(--text-primary)] rounded bg-[var(--surface-subtle)] border border-[var(--border-subtle)] cursor-pointer"
                    >
                      Manter apenas como movimento textual (sem vídeo)
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[var(--border-subtle)] bg-[var(--surface-subtle)]/40 flex flex-col sm:flex-row items-center gap-2">
          {/* Main Action (Green) */}
          <button
            type="button"
            onClick={handleConfirmSequence}
            disabled={isSaving || isLoadingSuggestions}
            className="w-full sm:flex-1 min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:opacity-50 text-white font-extrabold text-xs shadow-md shadow-emerald-600/20 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Salvando sequência...</span>
              </>
            ) : (
              <span>✓ Confirmar sequência</span>
            )}
          </button>

          {/* Secondary Action */}
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="w-full sm:w-auto min-h-[44px] px-3.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          >
            Manter somente como texto
          </button>

          {/* Tertiary Action */}
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="w-full sm:w-auto min-h-[44px] px-3 rounded-xl text-xs font-semibold text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors cursor-pointer"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
