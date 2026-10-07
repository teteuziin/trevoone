"use client";

import React, { useState, useEffect, useTransition, useMemo, useCallback } from "react";
import type { BlockItemMediaDto, ExerciseItemDto, ExerciseMediaDto } from "@/lib/training-v2/types";
import {
  searchExercisesForPickerAction,
  getExerciseForPickerAction,
} from "@/app/consultoria/[slug]/rotinas/actions";

function SearchIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" strokeLinecap="round" />
    </svg>
  );
}

function XIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function VideoIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <polygon points="23 7 16 12 23 17 23 7" />
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
  );
}

function PlayIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function CheckIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
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

function LoaderIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" />
    </svg>
  );
}

function SparklesIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.286L13 21l-2.286-6.857L5 12l5.714-2.286L13 3z" />
    </svg>
  );
}

function GlobeIcon({ className = "w-3 h-3" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

function BuildingIcon({ className = "w-3 h-3" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 20V6a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v14" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2 20h20" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M14 12v.01M14 16v.01M10 12v.01M10 16v.01" />
    </svg>
  );
}

function LockIcon({ className = "w-3 h-3" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

export interface PlayableMediaItem {
  publicId: string;
  url: string;
  mimeType: string;
  isGif: boolean;
  isVideo: boolean;
  role: string;
}

export function extractPlayableMediasFromExercise(
  ex: ExerciseItemDto | { media?: (ExerciseMediaDto | BlockItemMediaDto)[] | null }
): PlayableMediaItem[] {
  if (!ex.media || !Array.isArray(ex.media)) return [];

  const candidates: PlayableMediaItem[] = [];

  for (const m of ex.media) {
    if (!m.mediaAsset?.publicId) continue;
    const mime = m.mediaAsset.mimeType?.toLowerCase() || "";
    const type = m.mediaAsset.mediaType;
    const role = m.role || "EXECUTION_VIDEO";

    const isGif = mime === "image/gif";
    const isVideo = mime === "video/mp4" || type === "VIDEO" || mime.startsWith("video/");

    if (role === "EXECUTION_VIDEO" || isGif || isVideo) {
      const ext = isGif ? ".gif" : ".mp4";
      candidates.push({
        publicId: m.mediaAsset.publicId,
        url: `/api/training-v2/media/${m.mediaAsset.publicId}${ext}`,
        mimeType: mime,
        isGif,
        isVideo: !isGif,
        role,
      });
    }
  }

  // Prioritize canonical EXECUTION_VIDEO over other video roles
  return candidates.sort((a, b) => {
    if (a.role === "EXECUTION_VIDEO" && b.role !== "EXECUTION_VIDEO") return -1;
    if (b.role === "EXECUTION_VIDEO" && a.role !== "EXECUTION_VIDEO") return 1;
    return 0;
  });
}

export function extractThumbnailUrl(
  ex: ExerciseItemDto | { media?: (ExerciseMediaDto | BlockItemMediaDto)[] | null }
): string | null {
  if (!ex.media || !Array.isArray(ex.media)) return null;

  const startImg = ex.media.find((m) => m.role === "START_IMAGE");
  const poster = ex.media.find((m) => m.role === "VIDEO_POSTER");
  const altImg = ex.media.find((m) => m.role === "ALTERNATE_IMAGE");
  const execVid = ex.media.find((m) => m.role === "EXECUTION_VIDEO");

  const chosen = startImg || poster || altImg || execVid || ex.media[0];
  if (!chosen?.mediaAsset?.publicId) return null;

  const isGif = chosen.mediaAsset.mimeType?.toLowerCase() === "image/gif";
  const ext = isGif ? ".gif" : "";
  return `/api/training-v2/media/${chosen.mediaAsset.publicId}${ext}`;
}

export interface ExerciseLibraryMediaPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  consultancySlug?: string;
  exercisePublicId?: string | null;
  exerciseName?: string | null;
  currentVideoUrl?: string | null;
  fallbackMedia?: (BlockItemMediaDto | ExerciseMediaDto)[] | null;
  onSelectMedia: (videoUrl: string) => void;
}

type SourceTab = "TODOS" | "TREVO_ONE" | "CONSULTORIA" | "MEUS";

export function ExerciseLibraryMediaPickerModal({
  isOpen,
  onClose,
  consultancySlug,
  exercisePublicId,
  exerciseName,
  currentVideoUrl,
  fallbackMedia = [],
  onSelectMedia,
}: ExerciseLibraryMediaPickerModalProps) {
  const [source, setSource] = useState<SourceTab>("TODOS");
  const [searchQuery, setSearchQuery] = useState("");
  const [exercises, setExercises] = useState<ExerciseItemDto[]>([]);
  const [previewingUrl, setPreviewingUrl] = useState<string | null>(null);
  const [recommendedExercise, setRecommendedExercise] = useState<ExerciseItemDto | null>(null);
  const [isSearching, startTransition] = useTransition();

  // Resolve consultancy slug safely
  const effectiveSlug = useMemo(() => {
    let slug = consultancySlug?.trim() || "";
    if (!slug && typeof window !== "undefined") {
      const match = window.location.pathname.match(/\/consultoria\/([^/?#]+)/);
      if (match && match[1]) {
        slug = decodeURIComponent(match[1]).trim();
      }
    }
    return slug;
  }, [consultancySlug]);

  // Derive immediate playable media from fallbackMedia
  const fallbackPlayables = useMemo(() => {
    return extractPlayableMediasFromExercise({ media: fallbackMedia });
  }, [fallbackMedia]);

  // Section 5: Intelligent Recommendation
  // If the item already has an associated library exercise, fetch its fresh entity asynchronously.
  useEffect(() => {
    if (!isOpen || !exercisePublicId || !effectiveSlug) {
      return;
    }

    let active = true;

    getExerciseForPickerAction(effectiveSlug, exercisePublicId)
      .then((res) => {
        if (!active) return;
        if (res.ok && res.data) {
          setRecommendedExercise(res.data);
        }
      })
      .catch(() => {
        // Non-blocking fallback
      });

    return () => {
      active = false;
    };
  }, [isOpen, exercisePublicId, effectiveSlug]);

  // Derive recommended media cleanly via useMemo (zero setState in effect body)
  const recommendedMedia = useMemo(() => {
    if (recommendedExercise) {
      const playables = extractPlayableMediasFromExercise(recommendedExercise);
      if (playables.length > 0) return playables[0];
    }
    return fallbackPlayables[0] || null;
  }, [recommendedExercise, fallbackPlayables]);

  // Search catalog exercises with debounce
  useEffect(() => {
    if (!isOpen || !effectiveSlug) return;

    let active = true;
    const timer = setTimeout(() => {
      startTransition(async () => {
        const res = await searchExercisesForPickerAction(effectiveSlug, {
          source,
          query: searchQuery.trim() || undefined,
        });

        if (active) {
          if (res.ok && res.data) {
            setExercises(res.data);
          } else {
            setExercises([]);
          }
        }
      });
    }, 200);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [isOpen, effectiveSlug, source, searchQuery]);

  const handleClose = useCallback(() => {
    setPreviewingUrl(null);
    onClose();
  }, [onClose]);

  // Keyboard escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleClose]);

  // Section 8: Only show exercises with playable media
  const exercisesWithPlayableMedia = useMemo(() => {
    return exercises.filter((ex) => {
      const playables = extractPlayableMediasFromExercise(ex);
      return playables.length > 0;
    });
  }, [exercises]);

  if (!isOpen) return null;

  function handleSelectVideo(url: string) {
    setPreviewingUrl(null);
    onSelectMedia(url);
    onClose();
  }

  function togglePreview(url: string) {
    setPreviewingUrl((current) => (current === url ? null : url));
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Escolher vídeo da biblioteca"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150"
    >
      {/* Backdrop click */}
      <div className="absolute inset-0 -z-10" onClick={handleClose} />

      <div className="w-full sm:max-w-2xl bg-[var(--surface)] border border-[var(--border-default)] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col h-[90vh] sm:h-auto sm:max-h-[85vh] overflow-hidden">
        {/* Mobile Pull Handle */}
        <div className="pt-3 pb-1 sm:hidden flex justify-center bg-[var(--surface)]">
          <div className="w-12 h-1 rounded-full bg-[var(--border-strong)] opacity-60" />
        </div>

        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-[var(--border-subtle)] space-y-3 shrink-0 bg-[var(--surface)]">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
                Biblioteca de Exercícios
              </span>
              <h2 className="text-base sm:text-lg font-heading font-black text-[var(--foreground)] truncate">
                Escolher Vídeo de Execução
              </h2>
            </div>
            <button
              type="button"
              onClick={handleClose}
              aria-label="Fechar seleção de vídeo"
              className="p-2 rounded-xl text-[var(--foreground-muted)] hover:bg-[var(--surface-subtle)] hover:text-[var(--foreground)] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
            >
              <XIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Context tip */}
          <p className="text-xs text-[var(--text-secondary)]">
            Reutilize uma mídia existente sem alterar a prescrição ou identificação do exercício.
          </p>

          {/* Search Input */}
          <div className="space-y-2">
            <div className="relative">
              <SearchIcon className="w-4 h-4 text-[var(--foreground-muted)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar exercício ou vídeo..."
                className="w-full pl-10 pr-9 py-2.5 text-xs sm:text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface-sunken)] focus:outline-none focus:ring-2 focus:ring-emerald-500 text-[var(--foreground)] min-h-[44px]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[var(--foreground-muted)] hover:text-[var(--foreground)] cursor-pointer"
                >
                  <XIcon className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Source tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
              {[
                { id: "TODOS", label: "Todos" },
                { id: "TREVO_ONE", label: "Trevo One" },
                { id: "CONSULTORIA", label: "Minha Consultoria" },
                { id: "MEUS", label: "Só para mim" },
              ].map((tab) => {
                const isActive = source === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setSource(tab.id as SourceTab)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all min-h-[36px] flex items-center cursor-pointer ${
                      isActive
                        ? "bg-emerald-600 text-white shadow-2xs"
                        : "text-[var(--foreground-muted)] hover:bg-[var(--surface-subtle)] hover:text-[var(--foreground)] border border-[var(--border-subtle)] bg-[var(--surface)]"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Section 5: Intelligent Recommendation Card */}
          {recommendedMedia && (
            <div
              data-testid="recommended-video-card"
              className="p-3.5 sm:p-4 rounded-2xl bg-emerald-500/10 border-2 border-emerald-500/30 space-y-3 relative shadow-xs"
            >
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                  <SparklesIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Vídeo Recomendado</span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-600 text-white">
                  Do próprio exercício
                </span>
              </div>

              <div className="flex items-start justify-between gap-3 flex-wrap sm:flex-nowrap">
                <div className="space-y-0.5 min-w-0">
                  <h3 className="text-sm font-bold text-[var(--foreground)]">
                    {recommendedExercise?.name || exerciseName || "Exercício Atual"}
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)]">
                    {recommendedExercise?.muscleGroupPrimary || "Demonstração técnica padrão deste exercício"}
                    {recommendedExercise?.equipment ? ` • ${recommendedExercise.equipment}` : ""}
                  </p>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 pt-1 sm:pt-0">
                  <button
                    type="button"
                    onClick={() => togglePreview(recommendedMedia.url)}
                    className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all min-h-[44px] cursor-pointer flex-1 sm:flex-initial ${
                      previewingUrl === recommendedMedia.url
                        ? "bg-emerald-600 text-white shadow-2xs"
                        : "bg-[var(--surface)] text-[var(--foreground)] border border-[var(--border-default)] hover:bg-[var(--surface-subtle)]"
                    }`}
                  >
                    <PlayIcon className="w-3.5 h-3.5 text-emerald-500" />
                    <span>{previewingUrl === recommendedMedia.url ? "Ocultar" : "Visualizar"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectVideo(recommendedMedia.url)}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-xs min-h-[44px] cursor-pointer flex-1 sm:flex-initial"
                  >
                    <CheckIcon className="w-4 h-4" />
                    <span>Usar vídeo da biblioteca</span>
                  </button>
                </div>
              </div>

              {/* Inline preview for recommended video */}
              {previewingUrl === recommendedMedia.url && (
                <div className="mt-2 rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center border border-emerald-500/40 relative shadow-inner animate-in fade-in duration-150">
                  {recommendedMedia.isGif ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={recommendedMedia.url}
                      alt="Demonstração"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <video
                      src={recommendedMedia.url}
                      controls
                      autoPlay
                      playsInline
                      preload="metadata"
                      className="w-full h-full object-contain"
                    />
                  )}
                </div>
              )}
            </div>
          )}

          {/* Library Section Header */}
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-[var(--border-subtle)]">
            <span className="text-[11px] font-black uppercase tracking-wider text-[var(--text-secondary)]">
              {recommendedMedia ? "Outros Vídeos da Biblioteca" : "Vídeos da Biblioteca"}
            </span>
            <span className="text-[11px] text-[var(--text-tertiary)] font-medium">
              {exercisesWithPlayableMedia.length}{" "}
              {exercisesWithPlayableMedia.length === 1 ? "vídeo disponível" : "vídeos disponíveis"}
            </span>
          </div>

          {/* Exercises List */}
          {isSearching ? (
            <div className="py-12 text-center text-xs text-[var(--foreground-muted)] flex flex-col items-center justify-center gap-2">
              <LoaderIcon className="w-6 h-6 animate-spin text-emerald-500" />
              <span>Buscando vídeos na biblioteca...</span>
            </div>
          ) : exercisesWithPlayableMedia.length === 0 ? (
            <div className="py-12 text-center text-xs text-[var(--foreground-muted)] space-y-2">
              <DumbbellIcon className="w-8 h-8 mx-auto text-[var(--foreground-muted)] opacity-50" />
              <p className="font-bold text-[var(--foreground)] text-sm">Nenhum vídeo disponível encontrado.</p>
              <p className="max-w-xs mx-auto text-[11px]">
                {searchQuery
                  ? "Tente buscar por outro termo ou nome do exercício."
                  : "Não há exercícios com vídeo cadastrados neste filtro."}
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {exercisesWithPlayableMedia.map((ex) => {
                const playables = extractPlayableMediasFromExercise(ex);
                const primaryMedia = playables[0];
                if (!primaryMedia) return null;

                const thumbUrl = extractThumbnailUrl(ex);
                const isCurrent = currentVideoUrl === primaryMedia.url;
                const isPreviewing = previewingUrl === primaryMedia.url;

                const isGlobal = ex.scope === "GLOBAL";
                const isShared = ex.scope === "CONSULTANCY" && ex.visibility === "CONSULTANCY";
                const isPrivate = ex.scope === "CONSULTANCY" && ex.visibility === "CREATOR_ONLY";

                return (
                  <div
                    key={ex.publicId}
                    data-testid={`library-video-item-${ex.publicId}`}
                    className={`p-3 sm:p-3.5 rounded-2xl border transition-all flex flex-col gap-2.5 ${
                      isCurrent
                        ? "border-emerald-500/70 bg-emerald-500/5 shadow-2xs"
                        : "border-[var(--border-default)] bg-[var(--surface)] hover:border-emerald-500/40"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      {/* Left: Thumbnail & meta */}
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-black/90 border border-[var(--border-subtle)] overflow-hidden shrink-0 flex items-center justify-center relative">
                          {thumbUrl ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={thumbUrl}
                              alt={ex.name}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <VideoIcon className="w-6 h-6 text-zinc-400" />
                          )}
                          {primaryMedia.isGif && (
                            <span className="absolute bottom-1 right-1 px-1 py-0.2 rounded text-[9px] font-black uppercase tracking-wider bg-black/80 text-white">
                              GIF
                            </span>
                          )}
                        </div>

                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-xs sm:text-sm font-bold text-[var(--foreground)] truncate">
                              {ex.name}
                            </h4>
                            {isGlobal && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                                <GlobeIcon className="w-2.5 h-2.5" />
                                Trevo One
                              </span>
                            )}
                            {isShared && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 shrink-0">
                                <BuildingIcon className="w-2.5 h-2.5" />
                                Consultoria
                              </span>
                            )}
                            {isPrivate && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 shrink-0">
                                <LockIcon className="w-2.5 h-2.5" />
                                Só para mim
                              </span>
                            )}
                            {isCurrent && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-600 text-white shrink-0">
                                ✓ Em uso
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-[11px] text-[var(--foreground-muted)] flex-wrap">
                            <span>{ex.muscleGroupPrimary}</span>
                            {ex.equipment && (
                              <>
                                <span>•</span>
                                <span>{ex.equipment}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => togglePreview(primaryMedia.url)}
                          className={`inline-flex items-center justify-center gap-1 px-2.5 py-2 rounded-xl text-xs font-semibold transition-all min-h-[44px] cursor-pointer ${
                            isPreviewing
                              ? "bg-emerald-600 text-white shadow-2xs"
                              : "bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] border border-[var(--border-subtle)]"
                          }`}
                          title="Visualizar demonstração"
                        >
                          <PlayIcon className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="hidden xs:inline">
                            {isPreviewing ? "Ocultar" : "Visualizar"}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSelectVideo(primaryMedia.url)}
                          className="inline-flex items-center justify-center gap-1 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-xs min-h-[44px] cursor-pointer"
                        >
                          <CheckIcon className="w-3.5 h-3.5" />
                          <span>Usar este vídeo</span>
                        </button>
                      </div>
                    </div>

                    {/* Inline video player when preview toggled */}
                    {isPreviewing && (
                      <div className="mt-1 rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center border border-emerald-500/40 relative shadow-inner animate-in fade-in duration-150">
                        {primaryMedia.isGif ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={primaryMedia.url}
                            alt={`Demonstração de ${ex.name}`}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <video
                            src={primaryMedia.url}
                            controls
                            autoPlay
                            playsInline
                            preload="metadata"
                            className="w-full h-full object-contain"
                          />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
