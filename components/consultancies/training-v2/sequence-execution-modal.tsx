"use client";

import React, { useState, useEffect } from "react";
import type { SequenceMediaExperience } from "@/lib/training-v2/sequence-media";

interface SequenceExecutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  experience: SequenceMediaExperience | null;
}

export function SequenceExecutionModal(props: SequenceExecutionModalProps) {
  if (!props.isOpen || !props.experience || (props.experience.items || []).length === 0) {
    return null;
  }
  return <SequenceExecutionModalContent {...props} />;
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
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-[var(--surface)] border border-[var(--border-default)] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[var(--border-subtle)] flex items-center justify-between gap-3 bg-[var(--surface-subtle)]/60">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Sequência Guiada • {currentIndex + 1} de {items.length}
              </span>
            </div>
            <h3 className="text-sm sm:text-base font-extrabold text-[var(--text-primary)] truncate">
              {experience?.title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar sequência"
            className="p-1.5 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)] transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Progress Dots */}
        <div className="flex items-center gap-1.5 px-5 pt-3 pb-1">
          {items.map((it, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setCurrentIndex(idx)}
              className={`h-1.5 rounded-full transition-all flex-1 cursor-pointer ${
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
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Movement Title & Sub-header */}
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <span className="px-2 py-0.5 rounded-md text-[11px] font-extrabold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                Movimento {currentIndex + 1}
              </span>
              {(currentItem?.repsText || currentItem?.durationText) && (
                <span className="text-xs font-bold text-[var(--text-secondary)]">
                  {currentItem.repsText || currentItem.durationText}
                </span>
              )}
            </div>
            <h4 className="text-lg sm:text-xl font-extrabold text-[var(--text-primary)] font-heading leading-tight">
              {currentItem?.name}
            </h4>
          </div>

          {/* Media Player Box */}
          <div className="rounded-2xl overflow-hidden bg-black aspect-video flex items-center justify-center border border-[var(--border-subtle)] shadow-inner">
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
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="text-center p-4 space-y-1.5 text-white/80">
                <span className="text-2xl block">🎬</span>
                <span className="text-xs font-semibold block text-white/90">
                  Vídeo de demonstração indisponível para este movimento
                </span>
                <span className="text-[11px] text-white/60 block">
                  Siga as instruções textuais abaixo para executar o exercício corretamente
                </span>
              </div>
            )}
          </div>

          {/* Instructions Snapshot */}
          {currentItem?.instructions && (
            <div className="p-3.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-xs space-y-1">
              <span className="font-bold text-[var(--text-primary)] text-[11px] block uppercase tracking-wider">
                Instruções:
              </span>
              <p className="whitespace-pre-line leading-relaxed text-[var(--text-secondary)]">
                {currentItem.instructions}
              </p>
            </div>
          )}

          {/* Movement Details (Muscle group & equipment) */}
          {(currentItem?.muscleGroup || currentItem?.equipment) && (
            <div className="flex items-center gap-2 flex-wrap text-xs text-[var(--text-tertiary)] font-medium">
              {currentItem.muscleGroup && (
                <span className="px-2 py-1 rounded-lg bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
                  Músculo: {currentItem.muscleGroup}
                </span>
              )}
              {currentItem.equipment && (
                <span className="px-2 py-1 rounded-lg bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
                  Equipamento: {currentItem.equipment}
                </span>
              )}
            </div>
          )}

          {/* Rest notice on last movement */}
          {isLast && experience?.restAfterSeconds && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-semibold flex items-center gap-2">
              <span>⏱️</span>
              <span>
                Fim da sequência! Descanso recomendado: <strong>{experience.restAfterSeconds}s</strong>
              </span>
            </div>
          )}
        </div>

        {/* Footer Navigation Bar */}
        <div className="p-4 border-t border-[var(--border-subtle)] bg-[var(--surface-subtle)]/40 flex items-center justify-between gap-3">
          <button
            type="button"
            disabled={isFirst}
            onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
            className="px-4 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface)] text-[var(--text-primary)] font-bold text-xs disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--surface-subtle)] transition-colors min-h-[44px] cursor-pointer"
          >
            ← Anterior
          </button>

          <span className="text-xs font-extrabold text-[var(--text-secondary)]">
            {currentIndex + 1} / {items.length}
          </span>

          {isLast ? (
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-xs transition-colors min-h-[44px] cursor-pointer"
            >
              Concluir Sequência ✓
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setCurrentIndex((prev) => Math.min(items.length - 1, prev + 1))}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-xs transition-colors min-h-[44px] cursor-pointer flex items-center gap-1.5"
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
