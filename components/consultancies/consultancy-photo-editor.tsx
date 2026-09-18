"use client";

import React, { useState, useRef, useEffect, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  updateConsultancyPhotoAction,
  removeConsultancyPhotoAction,
} from "@/app/consultoria/[slug]/actions";

interface ConsultancyPhotoEditorProps {
  consultancySlug: string;
  consultancyName: string;
  currentLogoUrl?: string | null;
}

export function ConsultancyPhotoEditor({
  consultancySlug,
  consultancyName,
  currentLogoUrl = null,
}: ConsultancyPhotoEditorProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imageElement, setImageElement] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState<number>(1.0);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [logoUrl, setLogoUrl] = useState<string | null>(currentLogoUrl || null);

  // When a file is chosen, load it into an HTMLImageElement
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input value so same file can be reselected if needed
    e.target.value = "";
    setFeedback(null);

    if (file.size > 5 * 1024 * 1024) {
      setFeedback({ type: "error", message: "O arquivo excede o limite de 5 MB." });
      return;
    }

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setFeedback({ type: "error", message: "Formato inválido. Use JPEG, PNG ou WebP." });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        setImageElement(img);
        setSelectedFile(file);
        setZoom(1.0);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Draw the adjusted image onto canvas whenever image or zoom changes
  useEffect(() => {
    if (!imageElement || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = 600; // Output resolution 600x600 px (crisp high-DPI)
    canvas.width = size;
    canvas.height = size;

    ctx.clearRect(0, 0, size, size);

    // Calculate scaling to cover canvas with zoom
    const imgRatio = imageElement.width / imageElement.height;
    let drawWidth = size;
    let drawHeight = size;

    if (imgRatio >= 1) {
      drawHeight = size * zoom;
      drawWidth = drawHeight * imgRatio;
    } else {
      drawWidth = size * zoom;
      drawHeight = drawWidth / imgRatio;
    }

    // Center crop
    const offsetX = (size - drawWidth) / 2;
    const offsetY = (size - drawHeight) / 2;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(imageElement, offsetX, offsetY, drawWidth, drawHeight);
  }, [imageElement, zoom]);

  // Handle Save
  const handleSave = () => {
    if (!canvasRef.current || !selectedFile || isPending) return;

    setFeedback(null);

    canvasRef.current.toBlob(
      (blob) => {
        if (!blob) {
          setFeedback({ type: "error", message: "Erro ao processar imagem para envio." });
          return;
        }

        const formData = new FormData();
        formData.append("photo", blob, "consultancy-logo.jpg");

        startTransition(async () => {
          try {
            const res = await updateConsultancyPhotoAction(consultancySlug, formData);
            if (res.success && res.logoUrl) {
              setLogoUrl(res.logoUrl);
              setFeedback({ type: "success", message: "Foto da consultoria atualizada com sucesso!" });
              setSelectedFile(null);
              setImageElement(null);
              router.refresh();
              setTimeout(() => setIsOpen(false), 1500);
            } else {
              setFeedback({ type: "error", message: res.error || "Não foi possível salvar a foto." });
            }
          } catch {
            setFeedback({ type: "error", message: "Erro de comunicação ao salvar imagem." });
          }
        });
      },
      "image/jpeg",
      0.92
    );
  };

  // Handle Remove
  const handleRemove = () => {
    if (isPending) return;
    setFeedback(null);

    startTransition(async () => {
      try {
        const res = await removeConsultancyPhotoAction(consultancySlug);
        if (res.success) {
          setLogoUrl(null);
          setSelectedFile(null);
          setImageElement(null);
          setFeedback({ type: "success", message: "Foto da consultoria removida." });
          router.refresh();
        } else {
          setFeedback({ type: "error", message: res.error || "Erro ao remover foto." });
        }
      } catch {
        setFeedback({ type: "error", message: "Erro de conexão ao remover foto." });
      }
    });
  };

  return (
    <div className="rounded-3xl border border-[var(--border-default)] bg-[var(--surface)] p-5 sm:p-6 shadow-xs space-y-4 depth-surface">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="relative w-14 h-14 rounded-2xl overflow-hidden bg-[var(--surface-subtle)] border border-[var(--border-default)] shrink-0 shadow-2xs flex items-center justify-center">
            {logoUrl ? (
              <Image
                src={logoUrl}
                alt={consultancyName}
                fill
                sizes="56px"
                className="object-cover"
              />
            ) : (
              <span className="font-heading font-bold text-xl text-[var(--brand)]">
                {(consultancyName.trim().charAt(0) || "C").toUpperCase()}
              </span>
            )}
          </div>

          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-heading text-sm sm:text-base font-bold text-[var(--text-primary)] truncate">
                Foto & Identidade da Consultoria
              </h3>
              <Badge variant="brand" size="sm">
                Visual
              </Badge>
            </div>
            <p className="text-xs text-[var(--text-secondary)] font-medium line-clamp-1">
              {logoUrl ? "Foto personalizada ativa" : "Nenhuma foto personalizada definida"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              setIsOpen(!isOpen);
              setFeedback(null);
            }}
            className="font-semibold text-xs min-h-[40px]"
          >
            {isOpen ? "Fechar Editor" : logoUrl ? "Alterar Foto & Zoom" : "Definir Foto"}
          </Button>

          {logoUrl && !isOpen && (
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={handleRemove}
              disabled={isPending}
              className="font-semibold text-xs min-h-[40px]"
            >
              Remover
            </Button>
          )}
        </div>
      </div>

      {/* Collapsible Editor Section */}
      {isOpen && (
        <div className="pt-4 border-t border-[var(--border-subtle)] space-y-5 animate-in fade-in duration-200">
          {/* Feedback message */}
          {feedback && (
            <div
              className={`p-3 rounded-xl text-xs font-medium ${
                feedback.type === "success"
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                  : "bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20"
              }`}
            >
              {feedback.message}
            </div>
          )}

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileSelect}
          />

          {!imageElement ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="p-8 rounded-2xl border-2 border-dashed border-[var(--border-strong)] hover:border-[var(--brand)] bg-[var(--surface-subtle)] text-center cursor-pointer transition-colors space-y-2 group"
            >
              <div className="w-12 h-12 rounded-full bg-[var(--brand-soft)] text-[var(--brand)] mx-auto flex items-center justify-center transition-transform group-hover:scale-105">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </div>
              <div>
                <p className="text-xs sm:text-sm font-bold text-[var(--text-primary)]">
                  Clique para escolher uma imagem
                </p>
                <p className="text-[11px] text-[var(--text-tertiary)]">
                  Formatos suportados: JPEG, PNG ou WebP (máx. 5 MB)
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Dual Live Preview: Rounded Badge + Header Banner */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 1. Square Badge Preview */}
                <div className="p-4 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-2 flex flex-col items-center">
                  <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Prévia: Ícone & Badge
                  </span>
                  <div className="relative w-28 h-28 rounded-2xl overflow-hidden border-2 border-[var(--border-default)] shadow-xs bg-black">
                    <canvas ref={canvasRef} className="w-full h-full object-cover" />
                  </div>
                </div>

                {/* 2. Banner Header Preview */}
                <div className="p-4 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-2 flex flex-col items-center">
                  <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Prévia: Topo da Consultoria
                  </span>
                  <div className="relative w-full h-28 rounded-2xl overflow-hidden border-2 border-[var(--border-default)] shadow-xs bg-black flex items-center justify-center">
                    <canvas className="w-full h-full object-cover" style={{ filter: "brightness(0.85)" }} />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent flex items-center px-4">
                      <span className="text-white font-heading font-bold text-sm truncate">
                        {consultancyName}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Interactive Zoom Control */}
              <div className="p-4 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-3">
                <div className="flex items-center justify-between">
                  <label htmlFor="zoom-slider" className="text-xs font-bold text-[var(--text-primary)]">
                    Enquadramento & Zoom: {zoom.toFixed(1)}x
                  </label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setZoom(1.0)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                        zoom === 1.0
                          ? "bg-[var(--brand)] text-white"
                          : "bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:text-[var(--text-primary)]"
                      }`}
                    >
                      Aberta (1.0x)
                    </button>
                    <button
                      type="button"
                      onClick={() => setZoom(1.4)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                        zoom === 1.4
                          ? "bg-[var(--brand)] text-white"
                          : "bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:text-[var(--text-primary)]"
                      }`}
                    >
                      Média (1.4x)
                    </button>
                    <button
                      type="button"
                      onClick={() => setZoom(1.8)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                        zoom === 1.8
                          ? "bg-[var(--brand)] text-white"
                          : "bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:text-[var(--text-primary)]"
                      }`}
                    >
                      Aproximada (1.8x)
                    </button>
                  </div>
                </div>

                <input
                  id="zoom-slider"
                  type="range"
                  min="1.0"
                  max="2.5"
                  step="0.05"
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="w-full accent-[var(--brand)] cursor-pointer"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="font-semibold text-xs min-h-[44px]"
                >
                  Trocar Imagem
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setSelectedFile(null);
                      setImageElement(null);
                    }}
                    className="font-semibold text-xs min-h-[44px]"
                  >
                    Cancelar
                  </Button>

                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={handleSave}
                    disabled={isPending}
                    className="font-bold text-xs min-h-[44px] shadow-sm flex items-center gap-2"
                  >
                    {isPending ? "Salvando..." : "Salvar Foto Ajustada"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
