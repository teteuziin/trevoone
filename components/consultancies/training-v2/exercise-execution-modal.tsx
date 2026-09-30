"use client";

import React, { useState, useEffect, useMemo } from "react";
import type { BlockItemMediaDto, ExerciseMediaDto } from "@/lib/training-v2/types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  exerciseName: string;
  exercisePublicId?: string | null;
  pinnedMedia?: (BlockItemMediaDto | ExerciseMediaDto)[];
  customVideoUrl?: string | null;
  instructions?: string | null;
}

export function ExerciseExecutionModal({
  isOpen,
  onClose,
  exerciseName,
  exercisePublicId,
  pinnedMedia = [],
  customVideoUrl,
  instructions,
}: Props) {
  const pinnedDerived = useMemo(() => {
    if (pinnedMedia && pinnedMedia.length > 0) {
      const exec = pinnedMedia.find((m) => m.role === "EXECUTION_VIDEO");
      const fallback = pinnedMedia.find(
        (m) => m.role === "START_IMAGE" || m.role === "VIDEO_POSTER" || m.role === "ALTERNATE_IMAGE"
      ) || pinnedMedia[0];

      const target = exec || fallback;
      if (target?.mediaAsset?.publicId) {
        const isVid = target.mediaAsset.mediaType === "VIDEO" || target.mediaAsset.mimeType === "video/mp4";
        const isGif = target.mediaAsset.mimeType === "image/gif";
        return {
          url: `/api/training-v2/media/${target.mediaAsset.publicId}`,
          isVideo: isVid,
          isGif,
        };
      }
    }

    if (customVideoUrl && customVideoUrl.trim()) {
      return {
        url: customVideoUrl.trim(),
        isVideo: true,
        isGif: false,
      };
    }

    return null;
  }, [pinnedMedia, customVideoUrl]);

  const [lazyMedia, setLazyMedia] = useState<{
    url: string;
    isVideo: boolean;
    isGif: boolean;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || pinnedDerived || !exercisePublicId) {
      return;
    }

    let isMounted = true;
    Promise.resolve().then(() => {
      if (isMounted) setIsLoading(true);
    });

    fetch(`/api/training-v2/exercises/${exercisePublicId}`)
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
        setIsLoading(false);
        if (data.ok && Array.isArray(data.exercise?.media) && data.exercise.media.length > 0) {
          const exec = data.exercise.media.find((m) => m.role === "EXECUTION_VIDEO");
          const fallback = data.exercise.media[0];
          const chosen = exec || fallback;
          if (chosen?.mediaAsset?.publicId) {
            const isVid = chosen.mediaAsset.mediaType === "VIDEO" || chosen.mediaAsset.mimeType === "video/mp4";
            const isGif = chosen.mediaAsset.mimeType === "image/gif";
            setLazyMedia({
              url: `/api/training-v2/media/${chosen.mediaAsset.publicId}`,
              isVideo: isVid,
              isGif,
            });
            return;
          }
        }
        setLazyMedia(null);
      })
      .catch(() => {
        if (isMounted) {
          setIsLoading(false);
          setLazyMedia(null);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, pinnedDerived, exercisePublicId]);

  const activeMedia = pinnedDerived || lazyMedia;

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-[var(--surface)] border border-[var(--border-default)] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between gap-3 bg-[var(--surface-subtle)]/60">
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
              Execução do Exercício
            </span>
            <h3 className="text-sm sm:text-base font-extrabold text-[var(--text-primary)] truncate">
              {exerciseName}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar modal de execução"
            className="p-1.5 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)] transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Media Container */}
        <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-4">
          <div className="w-full rounded-2xl bg-black/95 border border-[var(--border-default)] min-h-[220px] max-h-[360px] flex items-center justify-center overflow-hidden relative">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center text-xs text-zinc-400 gap-2 p-6">
                <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                <span>Carregando execução...</span>
              </div>
            ) : activeMedia ? (
              activeMedia.isVideo ? (
                <video
                  autoPlay
                  loop
                  muted
                  playsInline
                  controls
                  preload="metadata"
                  src={activeMedia.url}
                  className="w-full h-full max-h-[360px] object-contain rounded-xl"
                />
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={activeMedia.url}
                  alt={`Execução de ${exerciseName}`}
                  className="w-full h-full max-h-[360px] object-contain rounded-xl"
                />
              )
            ) : (
              <div className="p-8 text-center space-y-2">
                <span className="text-3xl block">🏋️</span>
                <p className="text-xs font-semibold text-zinc-300">
                  Execução ainda não disponível para este exercício.
                </p>
                <p className="text-[11px] text-zinc-500 max-w-xs mx-auto">
                  Você pode salvar o treino normalmente ou adicionar uma mídia na Biblioteca de Exercícios.
                </p>
              </div>
            )}
          </div>

          {/* Short instructions if available */}
          {instructions && instructions.trim().length > 0 && (
            <div className="p-3.5 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] space-y-1">
              <span className="font-bold text-[var(--text-primary)] block">Instruções:</span>
              <p className="leading-relaxed line-clamp-4">{instructions.trim()}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[var(--border-subtle)] bg-[var(--surface-subtle)]/40 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors shadow-2xs min-h-[38px] cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
