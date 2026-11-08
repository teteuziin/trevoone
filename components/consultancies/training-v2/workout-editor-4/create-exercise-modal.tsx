"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  createCustomExerciseAction,
  searchExercisesForPickerAction,
} from "@/app/consultoria/[slug]/rotinas/actions";
import { createConsultancyExerciseDraftAction } from "@/app/consultoria/[slug]/exercicios/actions";
import type { ExerciseItemDto, WorkoutBlockItemDto } from "@/lib/training-v2/types";

interface CreateExerciseModalProps {
  isOpen: boolean;
  onClose: () => void;
  consultancySlug: string;
  blockPublicId?: string; // If provided, enables "Salvar e adicionar" to this block
  initialName?: string;
  onExerciseCreated?: (exercise: ExerciseItemDto, blockItem?: WorkoutBlockItemDto) => void;
}

const MUSCLE_GROUPS = [
  "Peito",
  "Costas",
  "Quadríceps",
  "Posterior",
  "Ombros",
  "Bíceps",
  "Tríceps",
  "Abdômen",
  "Glúteos",
  "Panturrilha",
  "Geral",
];

const EQUIPMENTS = [
  "Halteres",
  "Barra",
  "Máquina",
  "Cabo/Polia",
  "Peso Corporal",
  "Elástico",
  "Livre",
  "Outro",
];

function XIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function UploadCloudIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
    </svg>
  );
}

function CheckCircleIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function SparklesIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
    </svg>
  );
}

interface SuggestedVideo {
  name: string;
  mediaUrl: string;
  mediaPublicId?: string;
}

export function CreateExerciseModal({
  isOpen,
  onClose,
  consultancySlug,
  blockPublicId,
  initialName = "",
  onExerciseCreated,
}: CreateExerciseModalProps) {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState("");
  const [muscleGroup, setMuscleGroup] = useState("Peito");
  const [equipment, setEquipment] = useState("Halteres");
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);

  // Media upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isGif, setIsGif] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadedMediaPublicId, setUploadedMediaPublicId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // AI Library Video Match state
  const [suggestedLibraryVideo, setSuggestedLibraryVideo] = useState<SuggestedVideo | null>(null);
  const [isSearchingVideoMatch, setIsSearchingVideoMatch] = useState(false);
  const [dismissedSuggestionForName, setDismissedSuggestionForName] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Search catalog for matching video when name changes and no user video is attached
  useEffect(() => {
    if (!isOpen) return;
    const trimmed = name.trim();
    if (trimmed.length < 3 || selectedFile || previewUrl || dismissedSuggestionForName === trimmed) {
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingVideoMatch(true);
      try {
        const res = await searchExercisesForPickerAction(consultancySlug, {
          query: trimmed,
          source: "TREVO_ONE",
        });

        if (res.ok && Array.isArray(res.data) && res.data.length > 0) {
          // Find first item with actual video or media asset
          const matchWithMedia = res.data.find(
            (ex) =>
              (ex.media && ex.media.length > 0 && ex.media[0]?.mediaAsset?.publicId) ||
              ex.customVideoUrl
          );

          if (matchWithMedia) {
            const assetPublicId = matchWithMedia.media?.[0]?.mediaAsset?.publicId;
            const url = assetPublicId
              ? `/api/training-v2/media/${assetPublicId}`
              : matchWithMedia.customVideoUrl || "";

            if (url) {
              setSuggestedLibraryVideo({
                name: matchWithMedia.name,
                mediaUrl: url,
                mediaPublicId: assetPublicId || undefined,
              });
            }
          }
        }
      } catch {
        // Non-blocking background suggestion failure
      } finally {
        setIsSearchingVideoMatch(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [name, consultancySlug, isOpen, selectedFile, previewUrl, dismissedSuggestionForName]);

  if (!isOpen) return null;

  // File selection and pre-validation
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);

    const mime = file.type.toLowerCase();
    const isVideoMp4 = mime === "video/mp4" || file.name.toLowerCase().endsWith(".mp4");
    const isImageGif = mime === "image/gif" || file.name.toLowerCase().endsWith(".gif");

    if (!isVideoMp4 && !isImageGif) {
      setUploadError("Formato não suportado. Envie um vídeo MP4 ou uma animação GIF.");
      return;
    }

    const maxBytes = isVideoMp4 ? 25 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxBytes) {
      setUploadError(
        isVideoMp4
          ? "O vídeo ultrapassa o limite máximo de 25MB."
          : "O GIF ultrapassa o limite máximo de 10MB."
      );
      return;
    }

    setSelectedFile(file);
    setIsGif(isImageGif);

    // Create object URL for instant preview
    const objUrl = URL.createObjectURL(file);
    setPreviewUrl(objUrl);
    setUploadedMediaPublicId(null);
    setSuggestedLibraryVideo(null);
  };

  const handleRemoveMedia = () => {
    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setUploadedMediaPublicId(null);
    setUploadError(null);
    setUploadProgress(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleAcceptLibraryVideo = (suggestion: SuggestedVideo) => {
    setPreviewUrl(suggestion.mediaUrl);
    setUploadedMediaPublicId(suggestion.mediaPublicId || null);
    setIsGif(suggestion.mediaUrl.toLowerCase().endsWith(".gif"));
    setSuggestedLibraryVideo(null);
  };

  const handleDismissLibraryVideo = () => {
    setDismissedSuggestionForName(name.trim());
    setSuggestedLibraryVideo(null);
  };

  // Upload file to server
  const uploadMediaAsync = async (): Promise<string | null> => {
    if (!selectedFile) return uploadedMediaPublicId;
    if (uploadedMediaPublicId) return uploadedMediaPublicId;

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const mime = isGif ? "image/gif" : "video/mp4";
      const targetUrl = `/api/training-v2/media?scope=CONSULTANCY&consultancy=${encodeURIComponent(
        consultancySlug
      )}&mediaType=${isGif ? "IMAGE" : "VIDEO"}`;

      xhr.open("POST", targetUrl, true);
      xhr.setRequestHeader("Content-Type", mime);

      xhr.upload.onprogress = (ev) => {
        if (ev.lengthComputable) {
          const percent = Math.round((ev.loaded / ev.total) * 100);
          setUploadProgress(percent);
        }
      };

      xhr.onload = () => {
        setUploadProgress(null);
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            setUploadedMediaPublicId(data.publicId);
            resolve(data.publicId);
          } catch {
            reject(new Error("Erro ao processar resposta do servidor."));
          }
        } else {
          try {
            const errData = JSON.parse(xhr.responseText);
            reject(new Error(errData.error || "Falha no envio da mídia."));
          } catch {
            reject(new Error(`Erro no envio (${xhr.status}).`));
          }
        }
      };

      xhr.onerror = () => {
        setUploadProgress(null);
        reject(new Error("Erro de conexão ao enviar o vídeo ou GIF."));
      };

      xhr.send(selectedFile);
    });
  };

  const handleSubmit = async (addToWorkout: boolean) => {
    setFormError(null);
    if (!name || !name.trim()) {
      setFormError("Informe o nome do exercício.");
      return;
    }

    setIsSubmitting(true);
    try {
      let mediaPublicId = uploadedMediaPublicId;
      if (selectedFile && !mediaPublicId) {
        mediaPublicId = await uploadMediaAsync();
      }

      if (addToWorkout && blockPublicId) {
        // Salva e adiciona à divisão atual do treino (vídeo é estritamente opcional)
        const res = await createCustomExerciseAction(consultancySlug, blockPublicId, {
          name: name.trim(),
          description: description.trim() || null,
          muscleGroup,
          equipment,
          instructions: description.trim() || null,
          mediaAssetPublicId: mediaPublicId || undefined,
          saveToLibrary: true,
        });

        if (!res.ok || !res.data) {
          setFormError(res.error || "Erro ao adicionar exercício ao treino.");
          return;
        }

        // Constrói objeto ExerciseItemDto correspondente para retorno imediato
        const createdEx: ExerciseItemDto = {
          publicId: res.data.exercisePublicId || res.data.publicId,
          scope: "CONSULTANCY",
          visibility: "CONSULTANCY",
          status: "PUBLISHED",
          name: res.data.exerciseNameSnapshot,
          muscleGroupPrimary: res.data.muscleGroupSnapshot || muscleGroup,
          equipment: res.data.equipmentSnapshot || equipment,
          description: description.trim() || null,
          instructions: res.data.instructionsSnapshot || null,
          difficultyLevel: "INTERMEDIATE",
          isCustomExercise: true,
          customVideoUrl: previewUrl || (mediaPublicId ? `/api/training-v2/media/${mediaPublicId}` : undefined),
        };

        if (onExerciseCreated) {
          onExerciseCreated(createdEx, res.data);
        }
        onClose();
      } else {
        // Salva somente na biblioteca da consultoria (vídeo é estritamente opcional)
        const res = await createConsultancyExerciseDraftAction(consultancySlug, {
          name: name.trim(),
          description: description.trim() || null,
          muscleGroupPrimary: muscleGroup,
          equipment,
          visibility: "CONSULTANCY",
        });

        if (!res.ok || !res.data) {
          setFormError(res.error || "Erro ao salvar exercício na biblioteca.");
          return;
        }

        if (onExerciseCreated) {
          onExerciseCreated(res.data);
        }
        onClose();
      }
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Erro ao cadastrar exercício.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Criar novo exercício"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 font-sans"
    >
      <div className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#E5E8E2] flex items-center justify-between gap-3 bg-[#FAFBF9]">
          <div>
            <h2 className="text-base sm:text-lg font-black text-[#102E23]">
              Criar novo exercício
            </h2>
            <p className="text-xs text-[#526058]">
              Disponível para toda a sua consultoria
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="w-8 h-8 rounded-full bg-[#F5F5F0] hover:bg-[#EAEFEA] text-[#526058] flex items-center justify-center transition-colors cursor-pointer"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
              {formError}
            </div>
          )}

          {/* 1. Nome do Exercício */}
          <div className="space-y-1">
            <label htmlFor="custom-ex-name" className="text-xs font-bold text-[#102E23] flex items-center gap-1">
              <span>Nome do exercício</span>
              <span className="text-rose-500">*</span>
            </label>
            <input
              id="custom-ex-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Supino Inclinado com Halteres pegada neutra"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E8E2] bg-[#FDFDFC] focus:outline-none focus:ring-2 focus:ring-[#176B49] text-sm text-[#102E23] placeholder-[#8C9890]"
              autoFocus
            />
          </div>

          {/* Sugestão Inteligente de Vídeo da Biblioteca (se detectada e sem vídeo) */}
          {suggestedLibraryVideo && !previewUrl && !selectedFile && (
            <div className="p-3.5 rounded-2xl bg-[#EBF7EE] border border-[#C3E6CC] space-y-2.5 animate-in fade-in duration-150">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-1.5 text-emerald-800">
                  <SparklesIcon className="w-4 h-4 text-[#176B49]" />
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#176B49]">
                    Sugestão de Vídeo da Biblioteca
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleDismissLibraryVideo}
                  className="text-[11px] font-semibold text-[#6B7870] hover:text-[#102E23] cursor-pointer"
                >
                  Ignorar
                </button>
              </div>

              <div>
                <p className="text-xs font-bold text-[#102E23]">
                  Encontramos um vídeo oficial compatível:
                </p>
                <p className="text-xs font-semibold text-[#176B49]">
                  {suggestedLibraryVideo.name}
                </p>
              </div>

              {suggestedLibraryVideo.mediaUrl && (
                <div className="relative rounded-xl overflow-hidden bg-black max-h-36 flex items-center justify-center">
                  <video
                    src={suggestedLibraryVideo.mediaUrl}
                    playsInline
                    loop
                    muted
                    autoPlay
                    className="max-h-36 w-auto object-contain"
                  />
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleAcceptLibraryVideo(suggestedLibraryVideo)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#176B49] text-white hover:bg-[#12583B] transition-colors shadow-2xs cursor-pointer flex items-center gap-1.5"
                >
                  <span>✓ Usar este vídeo</span>
                </button>
                <button
                  type="button"
                  onClick={handleDismissLibraryVideo}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-[#526058] hover:bg-white/60 transition-colors cursor-pointer"
                >
                  Não, obrigado
                </button>
              </div>
            </div>
          )}

          {/* 2. Upload de Vídeo ou GIF */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#102E23]">
                Vídeo ou GIF demonstrativo <span className="text-[#8C9890] font-normal">(opcional)</span>
              </label>
              {isSearchingVideoMatch && (
                <span className="text-[10px] text-[#176B49] font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#176B49] animate-ping" />
                  Buscando vídeo na biblioteca...
                </span>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="video/mp4,image/gif"
              onChange={handleFileSelect}
              className="hidden"
            />

            {!previewUrl ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-[#D5E2D7] hover:border-[#176B49] bg-[#FAFBF9] hover:bg-[#F3F7F4] rounded-2xl p-5 text-center cursor-pointer transition-all space-y-2"
              >
                <div className="w-10 h-10 rounded-2xl bg-[#EDF5F0] text-[#176B49] flex items-center justify-center mx-auto">
                  <UploadCloudIcon className="w-5 h-5" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-[#102E23]">
                    Toque para escolher vídeo ou GIF
                  </p>
                  <p className="text-[11px] text-[#6B7870]">
                    MP4 até 25MB ou animação GIF até 10MB
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2 bg-[#F5F5F0] border border-[#E5E8E2] rounded-2xl p-3">
                <div className="relative rounded-xl overflow-hidden bg-black max-h-56 flex items-center justify-center">
                  {isGif ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={previewUrl}
                      alt="Prévia do GIF"
                      className="max-h-56 w-auto object-contain"
                    />
                  ) : (
                    <video
                      src={previewUrl}
                      playsInline
                      loop
                      muted
                      controls
                      className="max-h-56 w-auto object-contain"
                    />
                  )}
                </div>

                {uploadProgress !== null && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-[#176B49] font-bold">
                      <span>Enviando mídia...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-[#E5E8E2] rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-[#176B49] h-1.5 rounded-full transition-all duration-150"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-[#12583B] font-bold flex items-center gap-1 truncate max-w-[200px]">
                    <CheckCircleIcon className="w-4 h-4 text-[#176B49]" />
                    <span>{selectedFile?.name || "Vídeo vinculado"}</span>
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs font-bold text-[#176B49] hover:underline cursor-pointer"
                    >
                      Trocar
                    </button>
                    <span className="text-[#CCD5CB]">•</span>
                    <button
                      type="button"
                      onClick={handleRemoveMedia}
                      className="text-xs font-bold text-rose-600 hover:underline cursor-pointer"
                    >
                      Remover
                    </button>
                  </div>
                </div>
              </div>
            )}

            {uploadError && (
              <p className="text-xs text-rose-600 font-semibold">{uploadError}</p>
            )}
          </div>

          {/* 3. Descrição / Orientações */}
          <div className="space-y-1">
            <label htmlFor="custom-ex-desc" className="text-xs font-bold text-[#102E23]">
              Descrição ou orientação de execução <span className="text-[#8C9890] font-normal">(opcional)</span>
            </label>
            <textarea
              id="custom-ex-desc"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Manter escápulas aduzidas e descer até o peitoral sem bater os halteres."
              className="w-full px-3.5 py-2 rounded-xl border border-[#E5E8E2] bg-[#FDFDFC] focus:outline-none focus:ring-2 focus:ring-[#176B49] text-xs text-[#102E23] placeholder-[#8C9890] resize-none"
            />
          </div>

          {/* 4. Mais Opções (Grupo Muscular & Equipamento) */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setIsOptionsOpen(!isOptionsOpen)}
              className="text-xs font-bold text-[#176B49] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>{isOptionsOpen ? "− Menos detalhes" : "+ Mais opções (grupo muscular, equipamento)"}</span>
            </button>

            {isOptionsOpen && (
              <div className="mt-3 p-3.5 bg-[#FAFBF9] border border-[#E5E8E2] rounded-2xl space-y-3 animate-in fade-in duration-150">
                <div className="space-y-1">
                  <label htmlFor="custom-ex-muscle" className="text-xs font-bold text-[#102E23]">Grupo Muscular Principal</label>
                  <select
                    id="custom-ex-muscle"
                    value={muscleGroup}
                    onChange={(e) => setMuscleGroup(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#E5E8E2] bg-white text-xs font-semibold text-[#102E23] focus:ring-2 focus:ring-[#176B49] outline-none"
                  >
                    {MUSCLE_GROUPS.map((mg) => (
                      <option key={mg} value={mg}>
                        {mg}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label htmlFor="custom-ex-equipment" className="text-xs font-bold text-[#102E23]">Equipamento</label>
                  <select
                    id="custom-ex-equipment"
                    value={equipment}
                    onChange={(e) => setEquipment(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#E5E8E2] bg-white text-xs font-semibold text-[#102E23] focus:ring-2 focus:ring-[#176B49] outline-none"
                  >
                    {EQUIPMENTS.map((eq) => (
                      <option key={eq} value={eq}>
                        {eq}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[#E5E8E2] bg-[#FAFBF9] flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-[#526058] hover:text-[#102E23] transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          {blockPublicId ? (
            <button
              type="button"
              disabled={isSubmitting || !name.trim()}
              onClick={() => handleSubmit(true)}
              className="px-5 py-2.5 rounded-xl text-xs font-black bg-[#176B49] text-white hover:bg-[#12583B] transition-all shadow-2xs hover:shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? "Salvando..." : "Salvar e adicionar"}
            </button>
          ) : (
            <button
              type="button"
              disabled={isSubmitting || !name.trim()}
              onClick={() => handleSubmit(false)}
              className="px-5 py-2.5 rounded-xl text-xs font-black bg-[#102E23] text-white hover:bg-[#176B49] transition-all shadow-2xs hover:shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? "Salvando..." : "Salvar na biblioteca"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
