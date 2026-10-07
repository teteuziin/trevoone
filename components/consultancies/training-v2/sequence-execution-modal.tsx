"use client";

import React, { useState, useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import type { SequenceMediaExperience } from "@/lib/training-v2/sequence-media";

interface SequenceExecutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  experience: SequenceMediaExperience | null;
}

export function SequenceExecutionModal(props: SequenceExecutionModalProps) {
  const isMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  if (!isMounted || !props.isOpen || !props.experience || (props.experience.items || []).length === 0) {
    return null;
  }

  return createPortal(<SequenceExecutionModalContent {...props} />, document.body);
}

function SequenceExecutionModalContent({
  onClose,
  experience,
}: SequenceExecutionModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [resolvedVideos, setResolvedVideos] = useState<Record<string, string | null>>({});

  const items = experience?.items || [];
  const currentItem = items[currentIndex];

  const isResolvingMedia = Boolean(
    currentItem?.exercisePublicId &&
    !currentItem?.media?.url &&
    resolvedVideos[currentItem.exercisePublicId] === undefined
  );

  // Dynamically resolve library video if not directly pinned
  useEffect(() => {
    if (!currentItem) return;

    // Check if media is already directly provided or already fetched
    if (
      currentItem.media?.url ||
      (currentItem.exercisePublicId && resolvedVideos[currentItem.exercisePublicId] !== undefined)
    ) {
      return;
    }

    if (!currentItem.exercisePublicId) return;

    let isMounted = true;

    fetch(`/api/training-v2/exercises/${currentItem.exercisePublicId}`)
      .then((res) => res.json())
      .then((data: {
        ok?: boolean;
        exercise?: {
          media?: Array<{
            role?: string;
            mediaAsset?: {
              publicId?: string;
              mediaType?: string;
              mimeType?: string;
            };
          }>;
        };
      }) => {
        if (!isMounted) return;
        if (data.ok && Array.isArray(data.exercise?.media) && data.exercise.media.length > 0) {
          const exec = data.exercise.media.find((m) => m.role === "EXECUTION_VIDEO");
          const fallback = data.exercise.media[0];
          const chosen = exec || fallback;
          if (chosen?.mediaAsset?.publicId) {
            setResolvedVideos((prev) => ({
              ...prev,
              [currentItem.exercisePublicId!]: `/api/training-v2/media/${chosen.mediaAsset!.publicId}`,
            }));
            return;
          }
        }
        setResolvedVideos((prev) => ({
          ...prev,
          [currentItem.exercisePublicId!]: null,
        }));
      })
      .catch(() => {
        if (isMounted) {
          setResolvedVideos((prev) => ({
            ...prev,
            [currentItem.exercisePublicId!]: null,
          }));
        }
      });

    return () => {
      isMounted = false;
    };
  }, [currentItem, resolvedVideos]);

  const activeVideoUrl =
    experience?.overrideMediaUrl ||
    currentItem?.media?.url ||
    (currentItem?.exercisePublicId ? resolvedVideos[currentItem.exercisePublicId] : null);

  const isLast = currentIndex === items.length - 1;
  const isFirst = currentIndex === 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={experience?.title || "Sequência de exercícios"}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150"
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

        {/* Header - Stacks / wraps cleanly on small screens */}
        <div className="px-4 sm:px-5 py-3 border-b border-[var(--border-subtle)] flex items-start justify-between gap-3 bg-[var(--surface-subtle)]/60 shrink-0 w-full min-w-0">
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 break-words">
                Sequência Guiada • {currentIndex + 1} de {items.length}
              </span>
            </div>
            <h3 className="text-sm sm:text-base font-extrabold text-[var(--text-primary)] font-heading leading-tight break-words">
              {experience?.title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar sequência"
            className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer shrink-0"
          >
            ✕
          </button>
        </div>

        {/* Progress Dots */}
        <div className="flex items-center gap-1.5 px-4 sm:px-5 pt-3 pb-1 w-full min-w-0 shrink-0">
          {items.map((it, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setCurrentIndex(idx)}
              className={`h-1.5 rounded-full transition-all flex-1 min-w-0 cursor-pointer ${
                idx === currentIndex
                  ? "bg-emerald-500"
                  : idx < currentIndex
                  ? "bg-emerald-500/40"
                  : "bg-[var(--surface-subtle)] border border-[var(--border-subtle)]"
              }`}
              title={`Ir para ${it.name}`}
            />
          ))}
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto overscroll-contain flex-1 w-full min-w-0">
          {/* Movement Title & Sub-header */}
          <div className="space-y-1 w-full min-w-0">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded-md text-[11px] font-extrabold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                Movimento {currentIndex + 1}
              </span>
              {(currentItem?.repsText || currentItem?.durationText) && (
                <span className="text-xs font-bold text-[var(--text-secondary)] truncate">
                  {currentItem.repsText || currentItem.durationText}
                </span>
              )}
            </div>
            <h4 className="text-base sm:text-lg font-extrabold text-[var(--text-primary)] font-heading leading-tight break-words">
              {currentItem?.name}
            </h4>
          </div>

          {/* Media Player Box - Constrained to 100% width */}
          <div className="rounded-2xl overflow-hidden bg-black aspect-video flex items-center justify-center border border-[var(--border-subtle)] shadow-inner w-full max-w-full">
            {isResolvingMedia ? (
              <div className="flex flex-col items-center gap-2 text-white/70 text-xs">
                <span className="w-6 h-6 border-2 border-white/20 border-t-emerald-400 rounded-full animate-spin" />
                <span>Carregando vídeo...</span>
              </div>
            ) : activeVideoUrl ? (
              <video
                key={activeVideoUrl}
                src={activeVideoUrl}
                controls
                playsInline
                autoPlay
                className="w-full max-w-full h-full object-contain"
              />
            ) : (
              <div className="text-center p-4 space-y-1.5 text-white/80 w-full max-w-full">
                <span className="text-2xl block">🎬</span>
                <span className="text-xs font-semibold block text-white/90 break-words">
                  Vídeo de demonstração indisponível para este movimento
                </span>
                <span className="text-[11px] text-white/60 block break-words">
                  Siga as instruções textuais abaixo para executar o exercício corretamente
                </span>
              </div>
            )}
          </div>

          {/* Instructions Snapshot */}
          {currentItem?.instructions && (
            <div className="p-3.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-xs space-y-1 w-full min-w-0">
              <span className="font-bold text-[var(--text-primary)] text-[11px] block uppercase tracking-wider">
                Instruções:
              </span>
              <p className="whitespace-pre-line leading-relaxed text-[var(--text-secondary)] break-words">
                {currentItem.instructions}
              </p>
            </div>
          )}

          {/* Movement Details (Muscle group & equipment) */}
          {(currentItem?.muscleGroup || currentItem?.equipment) && (
            <div className="flex items-center gap-2 flex-wrap text-xs text-[var(--text-tertiary)] font-medium w-full min-w-0">
              {currentItem.muscleGroup && (
                <span className="px-2 py-1 rounded-lg bg-[var(--surface-subtle)] border border-[var(--border-subtle)] truncate">
                  Músculo: {currentItem.muscleGroup}
                </span>
              )}
              {currentItem.equipment && (
                <span className="px-2 py-1 rounded-lg bg-[var(--surface-subtle)] border border-[var(--border-subtle)] truncate">
                  Equipamento: {currentItem.equipment}
                </span>
              )}
            </div>
          )}

          {/* Rest notice on last movement */}
          {isLast && experience?.restAfterSeconds && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-semibold flex items-center gap-2 w-full min-w-0">
              <span className="shrink-0">⏱️</span>
              <span className="break-words">
                Fim da sequência! Descanso recomendado: <strong>{experience.restAfterSeconds}s</strong>
              </span>
            </div>
          )}
        </div>

        {/* Footer Navigation Bar */}
        <div className="p-3.5 sm:p-4 border-t border-[var(--border-subtle)] bg-[var(--surface-subtle)]/40 flex items-center justify-between gap-2.5 sm:gap-3 w-full min-w-0 shrink-0">
          <button
            type="button"
            disabled={isFirst}
            onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
            className="px-3.5 sm:px-4 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface)] text-[var(--text-primary)] font-bold text-xs disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--surface-subtle)] transition-colors min-h-[44px] cursor-pointer shrink-0"
          >
            ← Anterior
          </button>

          <span className="text-xs font-extrabold text-[var(--text-secondary)] text-center min-w-0 truncate px-1">
            {currentIndex + 1} / {items.length}
          </span>

          {isLast ? (
            <button
              type="button"
              onClick={onClose}
              className="px-4 sm:px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-xs transition-colors min-h-[44px] cursor-pointer shrink-0"
            >
              Concluir ✓
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setCurrentIndex((prev) => Math.min(items.length - 1, prev + 1))}
              className="px-4 sm:px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-xs transition-colors min-h-[44px] cursor-pointer flex items-center gap-1.5 shrink-0"
            >
              <span>Próximo</span>
              <span>→</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
