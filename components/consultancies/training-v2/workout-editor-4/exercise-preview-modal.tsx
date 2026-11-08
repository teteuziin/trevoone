"use client";

import React, { useState, useEffect } from "react";
import type { ExerciseItemDto, ExerciseMediaDto } from "@/lib/training-v2/types";

interface ExercisePreviewModalProps {
  exercise: ExerciseItemDto | null;
  isOpen: boolean;
  onClose: () => void;
  onAdd?: (exercise: ExerciseItemDto) => Promise<void>;
  isAdding?: boolean;
}

function XIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function DumbbellIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.5 6.5l11 11M6.5 17.5l11-11M3 8l3-3m0 0l3 3M3 16l3 3m0 0l3-3m9-8l3-3m0 0l3 3m-3 11l3-3m0 0l3 3" />
    </svg>
  );
}

function ExternalLinkIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
    </svg>
  );
}

// Helper to parse embeddable video links (YouTube Shorts, YouTube watch, Vimeo)
function parseEmbedVideo(url?: string | null) {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();

  // YouTube Shorts: youtube.com/shorts/VIDEO_ID
  const shortsMatch = trimmed.match(/(?:youtube\.com|youtu\.be)\/shorts\/([a-zA-Z0-9_-]+)/i);
  if (shortsMatch && shortsMatch[1]) {
    return {
      type: "youtube" as const,
      isShorts: true,
      embedUrl: `https://www.youtube-nocookie.com/embed/${shortsMatch[1]}?autoplay=0&mute=1&playsinline=1&rel=0`,
    };
  }

  // YouTube regular: watch?v=ID or youtu.be/ID or embed/ID
  const ytMatch = trimmed.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]+)/i);
  if (ytMatch && ytMatch[1]) {
    return {
      type: "youtube" as const,
      isShorts: false,
      embedUrl: `https://www.youtube-nocookie.com/embed/${ytMatch[1]}?autoplay=0&mute=1&playsinline=1&rel=0`,
    };
  }

  // Vimeo
  const vimeoMatch = trimmed.match(/vimeo\.com\/(?:video\/)?([0-9]+)/i);
  if (vimeoMatch && vimeoMatch[1]) {
    return {
      type: "vimeo" as const,
      isShorts: false,
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}?muted=1&playsinline=1`,
    };
  }

  return null;
}

function ExercisePreviewModalContent({
  exercise,
  onClose,
  onAdd,
  isAdding,
}: {
  exercise: ExerciseItemDto;
  onClose: () => void;
  onAdd?: (exercise: ExerciseItemDto) => Promise<void>;
  isAdding: boolean;
}) {
  const hasLocalMedia = Boolean((exercise.media && exercise.media.length > 0) || exercise.customVideoUrl);
  const [videoError, setVideoError] = useState(false);
  const [fetchedMedia, setFetchedMedia] = useState<ExerciseMediaDto[] | null>(null);
  const [fetchedInstructions, setFetchedInstructions] = useState<string | null>(null);
  const [isLoadingMedia, setIsLoadingMedia] = useState<boolean>(!hasLocalMedia && Boolean(exercise.publicId));

  // Fallback: If exercise has no media and no customVideoUrl, attempt to fetch from catalog API
  useEffect(() => {
    if (hasLocalMedia || !exercise.publicId) return;

    let isMounted = true;
    fetch(`/api/training-v2/exercises/${exercise.publicId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!isMounted || !data?.ok || !data.exercise) return;
        if (Array.isArray(data.exercise.media) && data.exercise.media.length > 0) {
          setFetchedMedia(data.exercise.media);
        }
        if (data.exercise.instructions && !exercise.instructions) {
          setFetchedInstructions(data.exercise.instructions);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setIsLoadingMedia(false);
      });

    return () => {
      isMounted = false;
    };
  }, [hasLocalMedia, exercise.publicId, exercise.instructions]);

  const activeMediaList = (exercise.media && exercise.media.length > 0) ? exercise.media : (fetchedMedia || []);
  const primaryMedia = activeMediaList[0]?.mediaAsset;
  const embedInfo = parseEmbedVideo(exercise.customVideoUrl);

  const isGif =
    primaryMedia?.mimeType === "image/gif" ||
    (exercise.customVideoUrl && exercise.customVideoUrl.toLowerCase().endsWith(".gif"));

  const directMediaUrl =
    exercise.customVideoUrl ||
    (primaryMedia ? `/api/training-v2/media/${primaryMedia.publicId}` : null);

  const isConsultancy = exercise.scope === "CONSULTANCY";
  const instructionsToShow = exercise.instructions || fetchedInstructions;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Demonstração de ${exercise.name}`}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 font-sans"
    >
      <div className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#E5E8E2] flex items-center justify-between gap-3 bg-[#FAFBF9]">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span
                className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider border ${
                  isConsultancy
                    ? "bg-[#EBF7EE] text-[#12583B] border-[#CDEED5]"
                    : "bg-[#F5F5F0] text-[#526058] border-[#E5E8E2]"
                }`}
              >
                {isConsultancy ? "Minha Consultoria" : "Biblioteca Oficial"}
              </span>
              {exercise.muscleGroupPrimary && (
                <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-[#FAFBF9] text-[#176B49] border border-[#D5E4D8]">
                  {exercise.muscleGroupPrimary}
                </span>
              )}
              {exercise.equipment && (
                <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-white text-[#6B7870] border border-[#E5E8E2]">
                  {exercise.equipment}
                </span>
              )}
            </div>
            <h2 className="text-base sm:text-lg font-black text-[#102E23] leading-tight truncate">
              {exercise.name}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar prévia"
            className="w-8 h-8 rounded-full bg-[#F5F5F0] hover:bg-[#EAEFEA] text-[#526058] flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body: Media & Instructions */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Media Player Container */}
          <div className="relative w-full rounded-2xl overflow-hidden bg-[#102E23] flex items-center justify-center min-h-[220px] max-h-[360px]">
            {isLoadingMedia ? (
              <div className="p-8 text-center space-y-2 text-white/80">
                <div className="w-7 h-7 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto" />
                <p className="text-xs text-white/70">Carregando demonstração...</p>
              </div>
            ) : embedInfo ? (
              /* Embedded YouTube / Vimeo Player */
              <div className={`w-full h-full min-h-[220px] max-h-[360px] flex items-center justify-center ${embedInfo.isShorts ? "aspect-[9/16]" : "aspect-video"}`}>
                <iframe
                  src={embedInfo.embedUrl}
                  title={`Demonstração de ${exercise.name}`}
                  className="w-full h-full min-h-[220px] max-h-[360px] border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
            ) : directMediaUrl && !videoError ? (
              isGif ? (
                /* GIF Player */
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={directMediaUrl}
                  alt={`Demonstração de ${exercise.name}`}
                  className="w-full h-auto max-h-[340px] object-contain"
                  onError={() => setVideoError(true)}
                />
              ) : (
                /* MP4 / Video Player */
                <video
                  src={directMediaUrl}
                  controls
                  playsInline
                  loop
                  muted
                  preload="metadata"
                  className="w-full h-auto max-h-[340px] object-contain"
                  onError={() => setVideoError(true)}
                >
                  Seu navegador não suporta a reprodução deste vídeo.
                </video>
              )
            ) : (
              /* Empty Fallback State */
              <div className="p-8 text-center space-y-2 text-white/80">
                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mx-auto text-white">
                  <DumbbellIcon className="w-6 h-6" />
                </div>
                <p className="text-xs font-bold text-white">
                  Sem vídeo demonstrativo anexado
                </p>
                <p className="text-[11px] text-white/60 max-w-xs mx-auto">
                  Este exercício pode ser prescrito normalmente com suas orientações escritas.
                </p>
                {exercise.customVideoUrl && (
                  <a
                    href={exercise.customVideoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors mt-2"
                  >
                    <span>Abrir link do vídeo</span>
                    <ExternalLinkIcon className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Description & Execution Tips */}
          {(exercise.description || instructionsToShow || exercise.executionTips) && (
            <div className="space-y-2 text-xs text-[#526058] bg-[#FDFDFC] border border-[#E5E8E2] rounded-2xl p-3.5">
              {exercise.description && (
                <div>
                  <h3 className="font-bold text-[#102E23] mb-0.5">Descrição:</h3>
                  <p className="leading-relaxed">{exercise.description}</p>
                </div>
              )}
              {instructionsToShow && (
                <div>
                  <h3 className="font-bold text-[#102E23] mb-0.5">Instruções de execução:</h3>
                  <p className="leading-relaxed whitespace-pre-line">{instructionsToShow}</p>
                </div>
              )}
              {exercise.executionTips && (
                <div>
                  <h3 className="font-bold text-[#102E23] mb-0.5">Dicas do Personal:</h3>
                  <p className="leading-relaxed whitespace-pre-line">{exercise.executionTips}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[#E5E8E2] bg-[#FAFBF9] flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-[#526058] hover:text-[#102E23] hover:bg-black/5 transition-colors cursor-pointer"
          >
            Fechar
          </button>

          {onAdd && (
            <button
              type="button"
              disabled={isAdding}
              onClick={async () => {
                await onAdd(exercise);
                onClose();
              }}
              className="px-5 py-2.5 rounded-xl text-xs font-black bg-[#176B49] text-white hover:bg-[#12583B] transition-all shadow-2xs hover:shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isAdding ? "Adicionando..." : "+ Adicionar ao treino"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function ExercisePreviewModal({
  exercise,
  isOpen,
  onClose,
  onAdd,
  isAdding = false,
}: ExercisePreviewModalProps) {
  if (!isOpen || !exercise) return null;

  return (
    <ExercisePreviewModalContent
      key={`${exercise.publicId || exercise.name}-${exercise.customVideoUrl || ""}`}
      exercise={exercise}
      onClose={onClose}
      onAdd={onAdd}
      isAdding={isAdding}
    />
  );
}
