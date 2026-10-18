"use client";

import React, { useState, useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import type { SequenceMediaExperience } from "@/lib/training-v2/sequence-media";
import {
  getCombinationTheme,
  STUDIO_COMBINATION_TYPE_LABELS,
} from "./training-studio-tokens";
import type { WorkoutCombinationType } from "@/lib/training-v2/types";

const emptySubscribe = () => () => {};

function useIsMounted() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}

interface SequenceExecutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  experience: SequenceMediaExperience | null;
}

export function SequenceExecutionModal(props: SequenceExecutionModalProps) {
  const isMounted = useIsMounted();

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
  const [failedVideoUrl, setFailedVideoUrl] = useState<string | null>(null);
  const [failedImgUrl, setFailedImgUrl] = useState<string | null>(null);

  const items = experience?.items || [];
  const currentItem = items[currentIndex];

  const combType = (experience?.type || "BI_SET") as WorkoutCombinationType;
  const theme = getCombinationTheme(combType);
  const typeLabel = STUDIO_COMBINATION_TYPE_LABELS[combType] || "Combinação";

  const isResolvingMedia = Boolean(
    currentItem?.exercisePublicId &&
    !currentItem?.media?.url &&
    resolvedVideos[currentItem.exercisePublicId] === undefined
  );

  // Dynamically resolve library video if not directly pinned
  useEffect(() => {
    if (!currentItem) return;

    if (
      currentItem.media?.url ||
      (currentItem.exercisePublicId && resolvedVideos[currentItem.exercisePublicId] !== undefined)
    ) {
      return;
    }

    if (!currentItem.exercisePublicId) return;

    let active = true;

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
        if (!active) return;
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
        if (active) {
          setResolvedVideos((prev) => ({
            ...prev,
            [currentItem.exercisePublicId!]: null,
          }));
        }
      });

    return () => {
      active = false;
    };
  }, [currentItem, resolvedVideos]);

  const activeVideoUrl =
    experience?.overrideMediaUrl ||
    currentItem?.media?.url ||
    (currentItem?.exercisePublicId ? resolvedVideos[currentItem.exercisePublicId] : null);

  const isVideoFailed = Boolean(activeVideoUrl && failedVideoUrl === activeVideoUrl);
  const isImgFailed = Boolean(activeVideoUrl && failedImgUrl === activeVideoUrl);

  const isLast = currentIndex === items.length - 1;
  const isFirst = currentIndex === 0;

  // Rounds and member prescription
  const rounds = experience?.rounds || currentItem?.rounds || currentItem?.setsCount || 3;
  const reps = currentItem?.repsText || "10 reps";
  const restAfterRound = experience?.restAfterSeconds ?? 60;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={experience?.title || "Sequência de exercícios"}
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-full sm:max-w-2xl bg-[var(--surface)] border-t sm:border border-[var(--border-default)] rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] sm:pb-0 animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200 text-[var(--text-primary)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile drag handle */}
        <div className="pt-2.5 pb-1 flex justify-center sm:hidden shrink-0">
          <div className="w-12 h-1 rounded-full bg-[var(--border-strong)]" />
        </div>

        {/* Header with Semantic Combination Hierarchy */}
        <div className={`px-4 sm:px-6 py-3.5 border-b border-[var(--border-subtle)] ${theme.headerBgClass} flex items-center justify-between gap-3 shrink-0`}>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider ${theme.badgeClass}`}>
                {typeLabel} · Exercício {currentIndex + 1} de {items.length}
              </span>
              <span className="text-xs font-bold text-[var(--text-secondary)]">
                {rounds} {rounds === 1 ? "volta prescrita" : "voltas prescritas"}
              </span>
            </div>
            <h3 className="text-sm sm:text-base font-black text-[var(--text-primary)] leading-tight truncate">
              {experience?.title || `${typeLabel} (${items.length} exercícios)`}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar sequência"
            className="w-10 h-10 min-h-[44px] min-w-[44px] rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors flex items-center justify-center cursor-pointer shrink-0"
          >
            ✕
          </button>
        </div>

        {/* Progress Step Bar */}
        <div className="flex items-center gap-1.5 px-4 sm:px-6 pt-3 pb-1 w-full min-w-0 shrink-0">
          {items.map((it, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setCurrentIndex(idx)}
              className={`h-2 rounded-full transition-all flex-1 min-w-0 cursor-pointer ${
                idx === currentIndex
                  ? "bg-emerald-500 shadow-xs"
                  : idx < currentIndex
                  ? "bg-emerald-500/50"
                  : "bg-[var(--surface-subtle)] border border-[var(--border-subtle)]"
              }`}
              title={`Ir para ${it.name}`}
            />
          ))}
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto overscroll-contain flex-1 w-full min-w-0">
          {/* Member Exercise Title & Letter Badge */}
          <div className="space-y-2 w-full min-w-0">
            <div className="flex items-center gap-2.5">
              <span className={`w-8 h-8 rounded-xl ${theme.letterAvatarClass} text-sm font-black flex items-center justify-center shrink-0 shadow-xs`}>
                {String.fromCharCode(65 + currentIndex)}.
              </span>
              <div className="min-w-0 flex-1">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--text-secondary)] block">
                  Membro {String.fromCharCode(65 + currentIndex)} da combinação
                </span>
                <h4 className="text-base sm:text-lg font-black text-[var(--text-primary)] leading-tight break-words">
                  {currentItem?.name}
                </h4>
              </div>
            </div>

            {/* Structured Prescription Chips */}
            <div className="flex items-center gap-2 flex-wrap pt-1">
              <span className="px-3 py-1.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                <span>🔄</span>
                <span>{rounds} voltas · {reps}</span>
              </span>

              {currentItem?.loadKg != null && (
                <span className="px-3 py-1.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                  <span>⚖️</span>
                  <span>Carga: {currentItem.loadKg} kg</span>
                </span>
              )}

              {currentItem?.advancedMethod && (
                <span className="px-3 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs font-bold text-purple-700 dark:text-purple-300">
                  ⚡ {currentItem.advancedMethod}
                </span>
              )}

              {currentItem?.muscleGroup && (
                <span className="px-2.5 py-1.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-xs font-medium text-[var(--text-secondary)]">
                  Músculo: {currentItem.muscleGroup}
                </span>
              )}

              {currentItem?.equipment && (
                <span className="px-2.5 py-1.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-xs font-medium text-[var(--text-secondary)]">
                  Equipamento: {currentItem.equipment}
                </span>
              )}
            </div>
          </div>

          {/* Media Player Box: ONLY if video available or loading. If unavailable, show compact banner */}
          {isResolvingMedia ? (
            <div className="rounded-2xl bg-black/90 aspect-video flex flex-col items-center justify-center gap-2 text-white/70 text-xs border border-[var(--border-subtle)] shadow-inner">
              <span className="w-6 h-6 border-2 border-white/20 border-t-emerald-400 rounded-full animate-spin" />
              <span>Carregando demonstração...</span>
            </div>
          ) : activeVideoUrl && !isVideoFailed && !isImgFailed ? (
            <div className="rounded-2xl overflow-hidden bg-black aspect-video flex items-center justify-center border border-[var(--border-subtle)] shadow-inner w-full max-w-full">
              {(() => {
                const isExplicitGif = Boolean(
                  currentItem?.media?.isGif ||
                  activeVideoUrl.toLowerCase().endsWith(".gif") ||
                  activeVideoUrl.toLowerCase().includes(".gif")
                );

                if (isExplicitGif) {
                  return (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      key={activeVideoUrl}
                      src={activeVideoUrl}
                      alt={currentItem?.name}
                      onError={() => setFailedImgUrl(activeVideoUrl)}
                      className="w-full max-w-full h-full object-contain"
                    />
                  );
                }

                return (
                  <video
                    key={activeVideoUrl}
                    src={activeVideoUrl}
                    controls
                    playsInline
                    preload="metadata"
                    onError={() => setFailedVideoUrl(activeVideoUrl)}
                    className="w-full max-w-full h-full object-contain"
                  />
                );
              })()}
            </div>
          ) : isVideoFailed || isImgFailed ? (
            <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 text-center space-y-2 text-white">
              <span className="text-xl block">⚠️</span>
              <p className="text-xs font-semibold text-zinc-300">Não foi possível carregar o vídeo de demonstração.</p>
              <button
                type="button"
                onClick={() => {
                  setFailedVideoUrl(null);
                  setFailedImgUrl(null);
                }}
                className="text-xs px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold transition-all cursor-pointer min-h-[36px]"
              >
                Tentar novamente
              </button>
            </div>
          ) : (
            /* COMPACT DEMONSTRATION UNAVAILABLE BANNER - Replaces huge black box */
            <div className="p-3.5 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] flex items-center gap-3 text-xs text-[var(--text-secondary)]">
              <span className="text-lg shrink-0">🎬</span>
              <div className="min-w-0 flex-1">
                <span className="font-bold text-[var(--text-primary)] block">
                  Demonstração em vídeo indisponível
                </span>
                <span className="text-[11px] text-[var(--text-secondary)] block">
                  Utilize as prescrições e orientações abaixo para a execução do movimento.
                </span>
              </div>
            </div>
          )}

          {/* Genuine Instructions Snapshot: ONLY rendered if actual text exists */}
          {currentItem?.instructions && currentItem.instructions.trim().length > 0 && (
            <div className="p-4 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-xs space-y-1.5 w-full min-w-0">
              <span className="font-extrabold text-[var(--text-primary)] text-[11px] block uppercase tracking-wider">
                Instruções de Execução:
              </span>
              <p className="whitespace-pre-line leading-relaxed text-[var(--text-secondary)] break-words">
                {currentItem.instructions.trim()}
              </p>
            </div>
          )}

          {/* Genuine Trainer Notes: ONLY rendered if present */}
          {currentItem?.notes && currentItem.notes.trim().length > 0 && (
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-1 text-amber-900 dark:text-amber-200">
              <span className="font-extrabold text-[11px] block uppercase tracking-wider">
                Observação do Treinador:
              </span>
              <p className="leading-relaxed break-words">{currentItem.notes.trim()}</p>
            </div>
          )}

          {/* Transition between items or Final Rest notice */}
          {!isLast ? (
            <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 text-xs font-bold flex items-center justify-center gap-2">
              <span>↓</span>
              <span>Transição direta para o próximo exercício (sem descanso intermediário)</span>
              <span>↓</span>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2.5">
              <span className="text-lg shrink-0">⏱️</span>
              <div className="min-w-0 flex-1">
                <span className="block font-black">Fim da volta! Descanso prescrito: {restAfterRound}s</span>
                <span className="text-[11px] font-normal opacity-90 block">
                  Após o descanso, repita a sequência até completar as {rounds} voltas prescritas.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation Bar */}
        <div className="p-3.5 sm:p-4 border-t border-[var(--border-subtle)] bg-[var(--surface-subtle)] flex items-center justify-between gap-3 w-full min-w-0 shrink-0">
          <button
            type="button"
            disabled={isFirst}
            onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
            className="px-4 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface)] text-[var(--text-primary)] font-bold text-xs disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--surface-hover)] transition-all min-h-[44px] cursor-pointer shrink-0 active:scale-[0.98]"
          >
            ← Anterior
          </button>

          <span className="text-xs font-black text-[var(--text-secondary)] text-center min-w-0 truncate px-2">
            {currentIndex + 1} de {items.length}
          </span>

          {isLast ? (
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md transition-all min-h-[44px] cursor-pointer shrink-0 active:scale-[0.98]"
            >
              Concluir visualização ✓
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setCurrentIndex((prev) => Math.min(items.length - 1, prev + 1))}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md transition-all min-h-[44px] cursor-pointer flex items-center gap-1.5 shrink-0 active:scale-[0.98]"
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
