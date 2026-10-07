"use client";

import React, { useState, useRef, useMemo } from "react";
function VideoIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );
}

function UploadIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
  );
}

function TrashIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

function RefreshCwIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}

function CheckIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function LinkIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
  );
}

function AlertCircleIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function XIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
import type { BlockItemMediaDto, ExerciseMediaDto } from "@/lib/training-v2/types";
import { resolveExerciseExecutionMedia } from "@/lib/training-v2/execution-media-resolver";
import { captureExerciseMediaFirstFrame } from "@/lib/training-v2/media-frame-capture";

export interface ExerciseVideoEditorSectionProps {
  currentVideoUrl?: string | null;
  fallbackMedia?: (BlockItemMediaDto | ExerciseMediaDto)[] | null;
  isCustomExercise?: boolean;
  canSaveToLibrary?: boolean;
  onVideoChange: (newVideoUrl: string | null, saveToLibrary?: boolean) => void;
  disabled?: boolean;
  consultancySlug?: string;
}

export function ExerciseVideoEditorSection({
  currentVideoUrl,
  fallbackMedia = [],
  isCustomExercise = false,
  canSaveToLibrary = false,
  onVideoChange,
  disabled = false,
  consultancySlug,
}: ExerciseVideoEditorSectionProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadPercent, setUploadPercent] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isUrlInputOpen, setIsUrlInputOpen] = useState(false);
  const [customUrlDraft, setCustomUrlDraft] = useState("");
  const [saveToLibrary, setSaveToLibrary] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Compute fallback media status when no item-level video override is present
  const fallbackResolved = useMemo(() => {
    return resolveExerciseExecutionMedia({
      item: { pinnedMedia: fallbackMedia, isCustomExercise },
    });
  }, [fallbackMedia, isCustomExercise]);

  const hasItemOverride = Boolean(currentVideoUrl && currentVideoUrl.trim().length > 0);
  const activeVideoUrl = hasItemOverride ? currentVideoUrl!.trim() : (fallbackResolved.hasMedia ? fallbackResolved.url : null);
  const isFallbackActive = !hasItemOverride && fallbackResolved.hasMedia;

  // Handle file selection and upload
  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so re-selecting the same file fires onChange
    if (fileInputRef.current) fileInputRef.current.value = "";

    // 1. Client-side MIME validation
    const fileType = file.type?.toLowerCase() || "";
    const fileName = file.name?.toLowerCase() || "";
    const isVideo = fileType === "video/mp4" || fileName.endsWith(".mp4");
    const isGif = fileType === "image/gif" || fileName.endsWith(".gif");

    if (!isVideo && !isGif) {
      setErrorMessage("Formato não suportado. Envie um vídeo MP4 ou GIF animado.");
      return;
    }

    // 2. Client-side Max size validation (100MB)
    const MAX_SIZE = 100 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setErrorMessage("O arquivo excede o limite máximo permitido de 100 MB.");
      return;
    }

    setErrorMessage(null);
    setIsUploading(true);
    setUploadPercent(0);
    setStatusMessage("Enviando vídeo...");

    try {
      // Background first frame capture for fast local poster
      try {
        await captureExerciseMediaFirstFrame(file);
      } catch {
        // frame capture failure is non-blocking
      }

      // Determine effective consultancy slug for tenancy context
      let effectiveConsultancy = consultancySlug?.trim() || "";
      if (!effectiveConsultancy && typeof window !== "undefined") {
        const match = window.location.pathname.match(/\/consultoria\/([^/?#]+)/);
        if (match && match[1]) {
          effectiveConsultancy = decodeURIComponent(match[1]).trim();
        }
      }

      // Upload with incremental progress via XMLHttpRequest
      const uploadUrl = `/api/training-v2/media?scope=CONSULTANCY&visibility=CONSULTANCY&mediaType=VIDEO${
        effectiveConsultancy ? `&consultancy=${encodeURIComponent(effectiveConsultancy)}` : ""
      }`;

      const uploadedPublicId = await new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", uploadUrl, true);
        xhr.setRequestHeader("Content-Type", file.type || "video/mp4");
        if (effectiveConsultancy) {
          xhr.setRequestHeader("x-consultancy-slug", effectiveConsultancy);
        }

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            setUploadPercent(percent);
            setStatusMessage(`Enviando vídeo... ${percent}%`);
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const res = JSON.parse(xhr.responseText);
              if (res.publicId) {
                resolve(res.publicId);
              } else {
                reject(new Error("Resposta de upload inválida."));
              }
            } catch {
              reject(new Error("Erro ao processar resposta do servidor."));
            }
          } else {
            let desc = "Não foi possível enviar o vídeo.";
            try {
              const errJson = JSON.parse(xhr.responseText);
              if (errJson.error) desc = errJson.error;
            } catch {
              // ignore
            }
            reject(new Error(desc));
          }
        };

        xhr.onerror = () => {
          reject(new Error("Erro de rede ao enviar o vídeo. Verifique sua conexão."));
        };

        xhr.send(file);
      });

      const newAssetUrl = `/api/training-v2/media/${uploadedPublicId}`;
      setStatusMessage("✓ Vídeo pronto");
      setUploadPercent(null);

      // Successfully updated: propagate to parent item state
      onVideoChange(newAssetUrl, saveToLibrary);
    } catch (err: unknown) {
      // Critical Section 16 requirement: on upload failure, previous video reference is PRESERVED!
      setStatusMessage(null);
      setUploadPercent(null);
      setErrorMessage(err instanceof Error ? err.message : "Não foi possível enviar o vídeo.");
    } finally {
      setIsUploading(false);
    }
  }

  // Handle URL submission
  function handleApplyCustomUrl(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = customUrlDraft.trim();
    if (!trimmed) {
      setErrorMessage("Insira uma URL de vídeo válida.");
      return;
    }

    if (
      !trimmed.startsWith("http://") &&
      !trimmed.startsWith("https://") &&
      !trimmed.startsWith("/api/training-v2/media/")
    ) {
      setErrorMessage("A URL deve começar com https://");
      return;
    }

    setErrorMessage(null);
    setIsUrlInputOpen(false);
    setCustomUrlDraft("");
    setStatusMessage("✓ URL vinculada");
    onVideoChange(trimmed, saveToLibrary);
  }

  // Handle removal: restores fallback library/custom video
  function handleRemoveVideo() {
    setErrorMessage(null);
    setStatusMessage("Vídeo específico removido.");
    onVideoChange(null, false);
  }

  return (
    <div
      data-testid="exercise-video-editor-section"
      className="p-3 sm:p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border-subtle)] space-y-3 w-full max-w-full min-w-0"
    >
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 min-w-0">
          <VideoIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="text-xs font-black uppercase tracking-wider text-[var(--text-primary)] truncate">
            Vídeo de Execução
          </span>
        </div>

        {hasItemOverride ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 shrink-0">
            ✓ Personalizado nesta ficha
          </span>
        ) : isFallbackActive ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--surface-subtle)] text-[var(--text-secondary)] border border-[var(--border-subtle)] shrink-0">
            Vídeo da biblioteca
          </span>
        ) : (
          <span className="text-[11px] text-[var(--text-tertiary)] font-medium">
            Opcional
          </span>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,image/gif"
        onChange={handleFileSelected}
        className="hidden"
        disabled={disabled || isUploading}
      />

      {/* Video Preview / Active State */}
      {activeVideoUrl ? (
        <div className="space-y-2.5 w-full max-w-full min-w-0">
          <div className="rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center relative border border-[var(--border-subtle)] w-full max-w-full min-w-0 shadow-2xs">
            {activeVideoUrl.toLowerCase().endsWith(".gif") ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={activeVideoUrl}
                alt="Demonstração"
                className="w-full h-full object-contain"
              />
            ) : (
              <video
                src={activeVideoUrl}
                controls
                playsInline
                preload="metadata"
                className="w-full h-full object-contain"
              />
            )}

            {isUploading && (
              <div className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center p-4 text-center space-y-2 backdrop-blur-xs">
                <RefreshCwIcon className="w-6 h-6 text-emerald-500 animate-spin" />
                <span className="text-xs font-bold text-white">
                  {statusMessage || "Enviando vídeo..."}
                </span>
                {uploadPercent != null && (
                  <div className="w-36 bg-white/20 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full transition-all duration-150"
                      style={{ width: `${uploadPercent}%` }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action buttons row */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              disabled={disabled || isUploading}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-[var(--text-primary)] border border-[var(--border-default)] transition-all min-h-[44px] cursor-pointer flex-1 sm:flex-initial"
              title="Substituir por outro arquivo de vídeo"
            >
              <RefreshCwIcon className="w-3.5 h-3.5 text-emerald-600" />
              <span>Substituir vídeo</span>
            </button>

            {hasItemOverride && (
              <button
                type="button"
                disabled={disabled || isUploading}
                onClick={handleRemoveVideo}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-500/10 hover:bg-rose-500/15 border border-rose-500/20 transition-all min-h-[44px] cursor-pointer"
                title="Remover vídeo personalizado desta ficha"
              >
                <TrashIcon className="w-3.5 h-3.5" />
                <span>Remover desta ficha</span>
              </button>
            )}

            <button
              type="button"
              disabled={disabled || isUploading}
              onClick={() => setIsUrlInputOpen(!isUrlInputOpen)}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] border border-[var(--border-subtle)] transition-all min-h-[44px] cursor-pointer"
              title="Usar link direto de vídeo"
            >
              <LinkIcon className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Usar URL</span>
            </button>
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="p-4 sm:p-5 rounded-xl border border-dashed border-[var(--border-default)] bg-[var(--surface-subtle)]/40 flex flex-col items-center justify-center text-center space-y-3 w-full max-w-full min-w-0">
          <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
            <VideoIcon className="w-5 h-5" />
          </div>

          <div className="space-y-0.5 max-w-xs">
            <p className="text-xs font-bold text-[var(--text-primary)]">
              Este exercício ainda não possui vídeo.
            </p>
            <p className="text-[11px] text-[var(--text-tertiary)]">
              Adicione um vídeo MP4 ou GIF de demonstração técnica para o aluno.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-center pt-1 w-full sm:w-auto">
            <button
              type="button"
              disabled={disabled || isUploading}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-xs min-h-[44px] cursor-pointer flex-1 sm:flex-initial"
            >
              <UploadIcon className="w-4 h-4" />
              <span>{isUploading ? "Enviando..." : "Enviar vídeo"}</span>
            </button>

            <button
              type="button"
              disabled={disabled || isUploading}
              onClick={() => setIsUrlInputOpen(!isUrlInputOpen)}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)] border border-[var(--border-default)] transition-all min-h-[44px] cursor-pointer"
            >
              <LinkIcon className="w-3.5 h-3.5" />
              <span>Usar URL</span>
            </button>
          </div>

          {isUploading && (
            <div className="w-full max-w-xs space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-[11px] font-bold text-[var(--text-secondary)]">
                <span>{statusMessage || "Enviando vídeo..."}</span>
                {uploadPercent != null && <span>{uploadPercent}%</span>}
              </div>
              <div className="w-full bg-[var(--border-subtle)] rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-emerald-600 h-full transition-all duration-150"
                  style={{ width: `${uploadPercent ?? 0}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* URL Input Form (Toggleable) */}
      {isUrlInputOpen && (
        <form onSubmit={handleApplyCustomUrl} className="p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-2 animate-in fade-in duration-100">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase">
              Link direto do vídeo (MP4 ou GIF)
            </label>
            <button
              type="button"
              onClick={() => setIsUrlInputOpen(false)}
              className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] p-1 min-h-[32px] min-w-[32px] flex items-center justify-center cursor-pointer"
            >
              <XIcon className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex items-center gap-1.5">
            <input
              type="url"
              value={customUrlDraft}
              onChange={(e) => setCustomUrlDraft(e.target.value)}
              placeholder="https://exemplo.com/video.mp4"
              className="flex-1 px-3 py-2 text-xs rounded-xl border border-[var(--border-default)] bg-[var(--surface)] text-[var(--text-primary)] focus:ring-2 focus:ring-emerald-500 focus:outline-none min-h-[40px]"
              autoFocus
            />
            <button
              type="submit"
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white min-h-[40px] flex items-center gap-1 cursor-pointer shrink-0"
            >
              <CheckIcon className="w-3.5 h-3.5" />
              <span>Aplicar</span>
            </button>
          </div>
        </form>
      )}

      {/* Status or error banner */}
      {statusMessage && !isUploading && (
        <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 animate-in fade-in">
          <CheckIcon className="w-3.5 h-3.5 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-xl animate-in fade-in">
          <AlertCircleIcon className="w-4 h-4 shrink-0" />
          <span className="flex-1">{errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="p-1 hover:opacity-75 cursor-pointer"
          >
            <XIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Optional secondary option: Save to library if permitted */}
      {canSaveToLibrary && hasItemOverride && (
        <label className="flex items-center gap-2 pt-1 text-xs text-[var(--text-secondary)] cursor-pointer select-none">
          <input
            type="checkbox"
            checked={saveToLibrary}
            onChange={(e) => {
              setSaveToLibrary(e.target.checked);
              onVideoChange(currentVideoUrl || null, e.target.checked);
            }}
            className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-[var(--border-default)] cursor-pointer"
          />
          <span>Salvar também como vídeo padrão deste exercício na biblioteca</span>
        </label>
      )}
    </div>
  );
}
