"use client";

import { useEffect } from "react";
import type { TrainingBlockExerciseDto } from "@/lib/consultancies/training";

type Props = {
  exercise: TrainingBlockExerciseDto | null;
  onClose: () => void;
};

export function TrainingVideoPlayer({ exercise, onClose }: Props) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!exercise) return null;

  const provider = exercise.videoProvider;
  const externalId = exercise.videoExternalId;
  const rawUrl = exercise.videoUrl;

  const isYouTube = provider === "YOUTUBE" && externalId && /^[a-zA-Z0-9_-]{6,15}$/.test(externalId);
  const isVimeo = provider === "VIMEO" && externalId && /^[0-9]{5,15}$/.test(externalId);
  const isExternal = provider === "EXTERNAL" && rawUrl && rawUrl.startsWith("https://");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="video-player-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-zinc-950 text-white rounded-2xl overflow-hidden shadow-2xl border border-zinc-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:px-6 border-b border-zinc-800">
          <div className="space-y-0.5 pr-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
              Execução do Exercício
            </span>
            <h3 id="video-player-title" className="text-sm sm:text-base font-bold text-zinc-100 truncate">
              {exercise.exerciseName}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-all cursor-pointer"
            aria-label="Fechar vídeo"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Video Player Container */}
        <div className="relative w-full aspect-video bg-black flex items-center justify-center">
          {isYouTube && (
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(externalId)}?rel=0`}
              title={`Execução: ${exercise.exerciseName}`}
              className="w-full h-full border-0"
              allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          )}

          {isVimeo && (
            <iframe
              src={`https://player.vimeo.com/video/${encodeURIComponent(externalId)}?dnt=1&title=0&byline=0&portrait=0`}
              title={`Execução: ${exercise.exerciseName}`}
              className="w-full h-full border-0"
              allow="fullscreen; picture-in-picture"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          )}

          {isExternal && (
            <div className="p-6 text-center space-y-4 max-w-md">
              <div className="w-12 h-12 rounded-full bg-zinc-800 text-emerald-400 mx-auto flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-zinc-100">Vídeo Externo Seguro</h4>
                <p className="text-xs text-zinc-400">
                  O vídeo deste exercício está hospedado em um link externo seguro.
                </p>
              </div>
              <a
                href={rawUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#00A859] hover:bg-[#008f4c] text-white text-xs font-bold rounded-lg shadow-sm transition-all"
              >
                Abrir Vídeo em Nova Aba ↗
              </a>
            </div>
          )}

          {!isYouTube && !isVimeo && !isExternal && (
            <div className="p-6 text-center space-y-2 text-zinc-400">
              <p className="text-sm font-semibold">Vídeo indisponível</p>
              <p className="text-xs text-zinc-500">
                Não foi possível carregar a prévia do vídeo para este exercício.
              </p>
            </div>
          )}
        </div>

        {/* Footer / Instructions snippet if any */}
        {(exercise.instructions || exercise.notes) && (
          <div className="p-4 bg-zinc-900 border-t border-zinc-800 text-xs text-zinc-400 space-y-1">
            {exercise.instructions && (
              <p>
                <strong className="text-zinc-200">Instruções:</strong> {exercise.instructions}
              </p>
            )}
            {exercise.notes && (
              <p>
                <strong className="text-zinc-200">Observações:</strong> {exercise.notes}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
