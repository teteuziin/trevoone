"use client";

import React, { useState, useRef } from "react";
import type { ExerciseMediaDto, MediaRole } from "@/lib/training-v2/types";
import {
  attachConsultancyExerciseMediaAction,
  detachConsultancyExerciseMediaAction,
} from "@/app/consultoria/[slug]/exercicios/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";

interface ConsultancyExerciseMediaManagerProps {
  slug: string;
  consultancyPublicId: string;
  exercisePublicId: string;
  exerciseVisibility: "CREATOR_ONLY" | "CONSULTANCY";
  mediaList: ExerciseMediaDto[];
  readOnly?: boolean;
  onMediaChange?: () => void;
}

type RoleConfig = {
  role: MediaRole;
  title: string;
  description: string;
  mediaType: "IMAGE" | "VIDEO";
  accept: string;
  maxSizeBytes: number;
  maxSizeLabel: string;
  isRequiredForPublish: boolean;
};

const ROLES: RoleConfig[] = [
  {
    role: "START_IMAGE",
    title: "Foto da Posição Inicial (START_IMAGE)",
    description: "Postura e empunhadura corretas antes do início do movimento.",
    mediaType: "IMAGE",
    accept: "image/jpeg,image/png,image/webp",
    maxSizeBytes: 5 * 1024 * 1024,
    maxSizeLabel: "5 MiB",
    isRequiredForPublish: false, // Recomendado para consultorias
  },
  {
    role: "EXECUTION_VIDEO",
    title: "Vídeo de Execução Técnica (EXECUTION_VIDEO)",
    description: "Vídeo MP4 com a execução técnica das repetições.",
    mediaType: "VIDEO",
    accept: "video/mp4",
    maxSizeBytes: 25 * 1024 * 1024,
    maxSizeLabel: "25 MiB",
    isRequiredForPublish: true, // Obrigatório
  },
  {
    role: "VIDEO_POSTER",
    title: "Poster do Vídeo (VIDEO_POSTER)",
    description: "Capa estática exibida antes do acionamento do vídeo.",
    mediaType: "IMAGE",
    accept: "image/jpeg,image/png,image/webp",
    maxSizeBytes: 5 * 1024 * 1024,
    maxSizeLabel: "5 MiB",
    isRequiredForPublish: false,
  },
];

export function ConsultancyExerciseMediaManager({
  slug,
  consultancyPublicId,
  exercisePublicId,
  exerciseVisibility,
  mediaList,
  readOnly = false,
  onMediaChange,
}: ConsultancyExerciseMediaManagerProps) {
  const [activeUploadRole, setActiveUploadRole] = useState<MediaRole | null>(null);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "associating" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const getMediaForRole = (role: MediaRole): ExerciseMediaDto | undefined => {
    return mediaList.find((m) => m.role === role);
  };

  const handleFileSelect = async (config: RoleConfig, e: React.ChangeEvent<HTMLInputElement>) => {
    if (readOnly) return;
    const file = e.target.files?.[0];
    if (!file) return;

    e.target.value = "";
    setErrorMessage(null);

    if (file.size > config.maxSizeBytes) {
      setErrorMessage(`O arquivo selecionado excede o limite máximo de ${config.maxSizeLabel}.`);
      return;
    }

    const fileType = file.type.toLowerCase();
    if (config.mediaType === "IMAGE" && !["image/jpeg", "image/png", "image/webp"].includes(fileType)) {
      setErrorMessage("Formato de imagem inválido. Envie JPG, PNG ou WEBP.");
      return;
    }
    if (config.mediaType === "VIDEO" && fileType !== "video/mp4") {
      setErrorMessage("Formato de vídeo inválido. Envie arquivo no formato MP4.");
      return;
    }

    try {
      setActiveUploadRole(config.role);
      setUploadStatus("uploading");

      // Upload follows exercise visibility (CREATOR_ONLY or CONSULTANCY)
      const uploadUrl = `/api/training-v2/media?scope=CONSULTANCY&visibility=${exerciseVisibility}&consultancy=${consultancyPublicId}&mediaType=${config.mediaType}`;
      const uploadRes = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          "Content-Type": file.type,
        },
        body: file,
      });

      if (!uploadRes.ok) {
        let errDesc = "Falha no envio do arquivo.";
        try {
          const errJson = await uploadRes.json();
          if (errJson.error) errDesc = errJson.error;
        } catch {
          // ignore
        }
        throw new Error(errDesc);
      }

      const assetData = await uploadRes.json();
      const mediaPublicId = assetData.publicId;

      setUploadStatus("associating");
      const attachRes = await attachConsultancyExerciseMediaAction(
        slug,
        exercisePublicId,
        mediaPublicId,
        config.role
      );

      if (!attachRes.ok) {
        throw new Error(attachRes.error || "Falha ao vincular a mídia ao exercício.");
      }

      setUploadStatus("success");
      if (onMediaChange) onMediaChange();

      setTimeout(() => {
        setUploadStatus("idle");
        setActiveUploadRole(null);
      }, 1500);
    } catch (err: unknown) {
      setUploadStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Erro no envio da mídia.");
    } finally {
      if (uploadStatus !== "success") {
        setTimeout(() => {
          setActiveUploadRole(null);
        }, 3000);
      }
    }
  };

  const handleDetach = async (role: MediaRole, mediaPublicId: string) => {
    if (readOnly || !confirm("Deseja realmente desvincular esta mídia do exercício?")) return;

    try {
      const res = await detachConsultancyExerciseMediaAction(slug, exercisePublicId, mediaPublicId, role);
      if (!res.ok) {
        alert(res.error || "Erro ao desvincular mídia.");
      } else if (onMediaChange) {
        onMediaChange();
      }
    } catch {
      alert("Erro ao desvincular mídia.");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-bold text-[var(--text-primary)] tracking-tight">
          Mídias de Demonstração
        </h3>
        <p className="text-xs text-[var(--text-tertiary)] mt-0.5 leading-relaxed">
          Vídeos e fotos de posicionamento para orientar a correta execução pelos alunos.
        </p>
      </div>

      {errorMessage && (
        <Alert variant="danger" title="Atenção">
          {errorMessage}
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {ROLES.map((cfg) => {
          const currentMedia = getMediaForRole(cfg.role);
          const isUploadingThis = activeUploadRole === cfg.role;
          const mediaUrl = currentMedia ? `/api/training-v2/media/${currentMedia.mediaAsset.publicId}` : null;
          const mediaVisibility = currentMedia?.mediaAsset.visibility;

          return (
            <div
              key={cfg.role}
              className={`flex flex-col bg-[var(--surface)] border rounded-2xl p-4 sm:p-5 transition-all ${
                cfg.isRequiredForPublish && !currentMedia
                  ? "border-[var(--border-strong)]"
                  : "border-[var(--border-default)]"
              } shadow-2xs`}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-[var(--text-primary)]">
                      {cfg.title.split(" (")[0]}
                    </h4>
                    {cfg.isRequiredForPublish ? (
                      <Badge variant="brand" size="sm" className="text-[10px] font-bold">
                        Obrigatório
                      </Badge>
                    ) : (
                      <Badge variant="neutral" size="sm" className="text-[10px]">
                        Opcional
                      </Badge>
                    )}
                    {currentMedia && mediaVisibility && (
                      <Badge
                        variant={mediaVisibility === "CONSULTANCY" ? "info" : "neutral"}
                        size="sm"
                        className="text-[10px]"
                      >
                        {mediaVisibility === "CONSULTANCY" ? "Consultoria" : "Só para mim"}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-[var(--text-tertiary)] mt-1">
                    {cfg.description}
                  </p>
                </div>
              </div>

              {/* Media Preview Box */}
              <div className="relative w-full aspect-video rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] flex items-center justify-center overflow-hidden my-auto">
                {currentMedia && mediaUrl ? (
                  cfg.mediaType === "IMAGE" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={mediaUrl}
                      alt={cfg.title}
                      className="w-full h-full object-contain"
                      loading="lazy"
                    />
                  ) : (
                    <video
                      controls
                      playsInline
                      preload="metadata"
                      className="w-full h-full object-contain bg-black"
                    >
                      <source src={mediaUrl} type="video/mp4" />
                      Seu navegador não suporta reprodução deste vídeo.
                    </video>
                  )
                ) : (
                  <div className="flex flex-col items-center justify-center p-4 text-center text-[var(--text-tertiary)]">
                    {cfg.mediaType === "IMAGE" ? (
                      <svg className="w-8 h-8 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                      </svg>
                    ) : (
                      <svg className="w-8 h-8 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                      </svg>
                    )}
                    <span className="text-xs font-medium">
                      Nenhuma mídia anexada
                    </span>
                    <span className="text-[11px] text-[var(--text-tertiary)] mt-0.5">
                      Máximo {cfg.maxSizeLabel} ({cfg.accept.replace(/video\/|image\//g, "").toUpperCase()})
                    </span>
                  </div>
                )}

                {/* Upload Status Overlay */}
                {isUploadingThis && (
                  <div className="absolute inset-0 bg-[var(--surface)]/90 backdrop-blur-2xs flex flex-col items-center justify-center p-4 text-center z-10 animate-in fade-in duration-150">
                    <div className="w-7 h-7 border-2 border-[var(--brand)] border-t-transparent rounded-full animate-spin mb-2" />
                    <span className="text-xs font-bold text-[var(--text-primary)]">
                      {uploadStatus === "uploading" && "Enviando arquivo..."}
                      {uploadStatus === "associating" && "Processando e vinculando..."}
                      {uploadStatus === "success" && "Concluído com sucesso!"}
                    </span>
                    <span className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                      Por favor, aguarde a confirmação
                    </span>
                  </div>
                )}
              </div>

              {/* Actions Footer */}
              {!readOnly && (
                <div className="mt-3.5 pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between gap-2">
                  <input
                    type="file"
                    ref={(el) => {
                      fileInputRefs.current[cfg.role] = el;
                    }}
                    accept={cfg.accept}
                    className="hidden"
                    onChange={(e) => handleFileSelect(cfg, e)}
                    disabled={isUploadingThis}
                  />

                  <Button
                    type="button"
                    variant={currentMedia ? "secondary" : "primary"}
                    size="sm"
                    disabled={isUploadingThis}
                    onClick={() => fileInputRefs.current[cfg.role]?.click()}
                    className="text-xs font-semibold"
                  >
                    {currentMedia ? "Substituir" : "Enviar mídia"}
                  </Button>

                  {currentMedia && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={isUploadingThis}
                      onClick={() => handleDetach(cfg.role, currentMedia.mediaAsset.publicId)}
                      className="text-xs text-[var(--danger)] hover:bg-[var(--danger-soft)]"
                    >
                      Remover
                    </Button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
