"use client";

import React, { useState, useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
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

export function SequenceConfigurationModal(props: SequenceConfigurationModalProps) {
  const isMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  if (!isMounted || !props.isOpen) {
    return null;
  }

  return createPortal(<SequenceConfigurationModalContent {...props} />, document.body);
}

function SequenceConfigurationModalContent({
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
      .catch(() => {
        if (!isMounted) return;
        setIsLoadingSuggestions(false);
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
      });

    return () => {
      isMounted = false;
    };
  }, [consultancySlug, detectedMovements]);

  const handleConfirmSequence = async () => {
    setIsSaving(true);
    setErrorMessage(null);

    try {
      const movementsPayload = movementAssignments.map((mov) => ({
        order: mov.order,
        label: mov.label,
        exercisePublicId: mov.selectedPublicId || undefined,
        repsText: mov.repsText || undefined,
        durationText: mov.durationText || undefined,
      }));

      const res = await updateItemCustomSequenceAction(consultancySlug, {
        itemPublicId: item.publicId,
        isSequence: true,
        movements: movementsPayload,
        rawText: item.exerciseNameSnapshot,
      });

      if (!res.ok) {
        throw new Error(res.error || "Erro ao salvar estrutura da sequência.");
      }

      if (res.data) {
        onSaved(res.data);
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Falha ao salvar sequência.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Estruturar sequência detectada"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-full sm:max-w-lg bg-[var(--surface)] border-t sm:border border-[var(--border-default)] rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh] sm:max-h-[92vh] pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] sm:pb-0 animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile drag handle */}
        <div className="pt-2.5 pb-1 flex justify-center sm:hidden shrink-0">
          <div className="w-12 h-1 rounded-full bg-[var(--border-strong)]" />
        </div>

        {/* Header */}
        <div className="px-4 sm:px-5 py-3.5 border-b border-[var(--border-subtle)] flex items-start justify-between gap-3 bg-[var(--surface-subtle)]/60 shrink-0 w-full min-w-0">
          <div className="min-w-0 flex-1 space-y-0.5">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-600 dark:text-purple-400 block break-words">
              ✨ Estruturação Assistida
            </span>
            <h3 className="text-sm sm:text-base font-extrabold text-[var(--text-primary)] font-heading leading-tight break-words">
              Sequência detectada
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer shrink-0"
          >
            ✕
          </button>
        </div>

        {/* Subtitle & Info */}
        <div className="px-4 sm:px-5 pt-3 pb-2 text-xs text-[var(--text-secondary)] space-y-1.5 shrink-0 w-full min-w-0">
          <p className="leading-relaxed break-words">
            Confirme os movimentos para usar os vídeos da biblioteca automaticamente.
          </p>
          <div className="px-3 py-1.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-[11px] font-medium text-[var(--text-tertiary)] break-words w-full">
            Texto original: <span className="text-[var(--text-primary)] font-semibold">{item.exerciseNameSnapshot}</span>
          </div>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="mx-4 sm:mx-5 my-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs shrink-0 break-words">
            {errorMessage}
          </div>
        )}

        {/* Movements List */}
        <div className="p-4 sm:p-5 space-y-3.5 overflow-y-auto overscroll-contain flex-1 w-full min-w-0">
          {isLoadingSuggestions ? (
            <div className="py-8 text-center space-y-2 text-[var(--text-tertiary)]">
              <span className="w-6 h-6 border-2 border-purple-500/30 border-t-purple-600 rounded-full animate-spin inline-block" />
              <p className="text-xs font-semibold">Localizando exercícios correspondentes na biblioteca...</p>
            </div>
          ) : (
            movementAssignments.map((mov, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-2.5 w-full min-w-0"
              >
                {/* Movement Label & Hints */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-5 h-5 rounded-full bg-purple-600 text-white text-[11px] font-extrabold flex items-center justify-center shrink-0">
                      {mov.order}
                    </span>
                    <span className="text-xs sm:text-sm font-extrabold text-[var(--text-primary)] break-words">
                      {mov.label}
                    </span>
                  </div>
                  {(mov.repsText || mov.durationText) && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20 shrink-0">
                      {mov.repsText || mov.durationText}
                    </span>
                  )}
                </div>

                {/* Association Box */}
                {!mov.isChanging ? (
                  <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border-default)] w-full min-w-0 flex-wrap sm:flex-nowrap">
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-bold uppercase text-[var(--text-tertiary)] block">
                        Sugestão vinculada:
                      </span>
                      {mov.selectedName ? (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 break-words">
                            {mov.selectedName} ✓
                          </span>
                          {mov.hasVideo && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 font-bold shrink-0">
                              Vídeo
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs font-semibold text-[var(--text-secondary)] italic break-words">
                          Nenhum exercício associado (execução textual)
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setMovementAssignments((prev) =>
                          prev.map((itemMov, i) => (i === idx ? { ...itemMov, isChanging: true } : itemMov))
                        );
                      }}
                      className="px-2.5 py-1.5 rounded-lg border border-[var(--border-default)] hover:bg-[var(--surface-subtle)] text-xs font-bold text-[var(--text-primary)] transition-colors cursor-pointer shrink-0 min-h-[36px]"
                    >
                      Trocar
                    </button>
                  </div>
                ) : (
                  /* Changing association / search picker */
                  <div className="p-3 rounded-xl bg-[var(--surface)] border border-purple-500/40 space-y-2 w-full min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-[var(--text-primary)]">
                        Selecione o exercício correspondente:
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setMovementAssignments((prev) =>
                            prev.map((itemMov, i) => (i === idx ? { ...itemMov, isChanging: false } : itemMov))
                          );
                        }}
                        className="text-xs font-bold text-purple-600 hover:text-purple-700 cursor-pointer p-1"
                      >
                        Cancelar
                      </button>
                    </div>

                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {mov.candidates.map((cand) => (
                        <button
                          key={cand.publicId}
                          type="button"
                          onClick={() => {
                            setMovementAssignments((prev) =>
                              prev.map((itemMov, i) =>
                                i === idx
                                  ? {
                                      ...itemMov,
                                      selectedPublicId: cand.publicId,
                                      selectedName: cand.name,
                                      hasVideo: cand.hasVideo,
                                      isChanging: false,
                                    }
                                  : itemMov
                              )
                            );
                          }}
                          className={`w-full p-2 rounded-lg text-left text-xs font-medium flex items-center justify-between gap-2 transition-colors min-h-[44px] cursor-pointer ${
                            mov.selectedPublicId === cand.publicId
                              ? "bg-purple-600 text-white font-bold"
                              : "hover:bg-[var(--surface-subtle)] text-[var(--text-primary)] border border-transparent hover:border-[var(--border-subtle)]"
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <span className="break-words block">{cand.name}</span>
                            {(cand.muscleGroup || cand.equipment) && (
                              <span
                                className={`text-[10px] block truncate ${
                                  mov.selectedPublicId === cand.publicId ? "text-purple-200" : "text-[var(--text-tertiary)]"
                                }`}
                              >
                                {[cand.muscleGroup, cand.equipment].filter(Boolean).join(" · ")}
                              </span>
                            )}
                          </div>
                          {cand.hasVideo && (
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded font-bold shrink-0 ${
                                mov.selectedPublicId === cand.publicId
                                  ? "bg-white/20 text-white"
                                  : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                              }`}
                            >
                              Vídeo
                            </span>
                          )}
                        </button>
                      ))}

                      {/* Option to clear association */}
                      <button
                        type="button"
                        onClick={() => {
                          setMovementAssignments((prev) =>
                            prev.map((itemMov, i) =>
                              i === idx
                                ? {
                                    ...itemMov,
                                    selectedPublicId: null,
                                    selectedName: null,
                                    hasVideo: false,
                                    isChanging: false,
                                  }
                                : itemMov
                            )
                          );
                        }}
                        className="w-full p-2 rounded-lg text-left text-xs font-medium text-amber-700 dark:text-amber-400 hover:bg-amber-500/10 transition-colors border border-dashed border-amber-500/30 min-h-[44px] cursor-pointer"
                      >
                        Nenhum vínculo (manter apenas como texto)
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-3.5 sm:p-4 border-t border-[var(--border-subtle)] bg-[var(--surface-subtle)]/40 flex flex-col sm:flex-row items-center gap-2 shrink-0 w-full min-w-0">
          {/* Main Action (Green) */}
          <button
            type="button"
            onClick={handleConfirmSequence}
            disabled={isSaving || isLoadingSuggestions}
            className="w-full sm:flex-1 min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 disabled:opacity-50 text-white font-extrabold text-xs shadow-md shadow-emerald-600/20 transition-all cursor-pointer flex items-center justify-center gap-2"
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
            className="w-full sm:w-auto min-h-[44px] px-3.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer text-center"
          >
            Manter somente como texto
          </button>

          {/* Tertiary Action */}
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="w-full sm:w-auto min-h-[44px] px-3 rounded-xl text-xs font-semibold text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors cursor-pointer text-center"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
