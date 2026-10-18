"use client";

import React, { useState, useTransition, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DuotonePhotosIcon } from "@/components/ui/icons/duotone-icons";
import type { PhotoEvaluationItem } from "@/lib/consultancies/personal-student-hub";
import {
  addPhotoEvaluationAction,
  deletePhotoEvaluationAction,
} from "@/app/consultoria/[slug]/progresso/alunos/[studentPublicId]/actions";

export interface StudentPhotosMuralProps {
  consultancySlug: string;
  studentPublicId: string;
  studentName: string;
  photos: PhotoEvaluationItem[];
  onRequestPhotosClick: () => void;
}

const POSE_KEYS = ["FRONT", "BACK", "LEFT_SIDE", "RIGHT_SIDE"] as const;
type PoseKey = (typeof POSE_KEYS)[number];

const POSE_CONFIG: Record<PoseKey, { label: string; aliases: string[] }> = {
  FRONT: { label: "Frente", aliases: ["FRONT"] },
  BACK: { label: "Costas", aliases: ["BACK"] },
  LEFT_SIDE: { label: "Lateral Esquerda", aliases: ["LEFT_SIDE", "SIDE_LEFT"] },
  RIGHT_SIDE: { label: "Lateral Direita", aliases: ["RIGHT_SIDE", "SIDE_RIGHT"] },
};

function formatDisplayDate(dateVal: unknown): string {
  if (!dateVal) return "—";
  const str = String(dateVal).trim();
  const ymdMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (ymdMatch) {
    const [, y, m, d] = ymdMatch;
    return `${d}/${m}/${y}`;
  }
  const parsed = new Date(str);
  if (isNaN(parsed.getTime())) return str;
  const d = String(parsed.getUTCDate()).padStart(2, "0");
  const m = String(parsed.getUTCMonth() + 1).padStart(2, "0");
  const y = parsed.getUTCFullYear();
  return `${d}/${m}/${y}`;
}

export function StudentPhotosMural({
  consultancySlug,
  studentPublicId,
  studentName,
  photos,
  onRequestPhotosClick,
}: StudentPhotosMuralProps) {
  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Lightbox state
  const [lightbox, setLightbox] = useState<{
    isOpen: boolean;
    imageUrl: string;
    pose: string;
    date: string;
    zoomLevel: number;
    requestIndex: number;
    poseIndex: number;
  }>({
    isOpen: false,
    imageUrl: "",
    pose: "",
    date: "",
    zoomLevel: 1,
    requestIndex: 0,
    poseIndex: 0,
  });

  // Compare state
  const [compareEvalA, setCompareEvalA] = useState<string>(
    photos.length > 1 ? photos[photos.length - 1].requestPublicId : (photos[0]?.requestPublicId || "")
  );
  const [compareEvalB, setCompareEvalB] = useState<string>(
    photos.length > 0 ? photos[0].requestPublicId : ""
  );
  const [comparePoseFilter, setComparePoseFilter] = useState<"ALL" | PoseKey>("ALL");

  // Add Photo Form State
  const [evalDateInput, setEvalDateInput] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [notesInput, setNotesInput] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<Record<PoseKey, File | null>>({
    FRONT: null,
    BACK: null,
    LEFT_SIDE: null,
    RIGHT_SIDE: null,
  });
  const [previews, setPreviews] = useState<Record<PoseKey, string | null>>({
    FRONT: null,
    BACK: null,
    LEFT_SIDE: null,
    RIGHT_SIDE: null,
  });
  const [addError, setAddError] = useState<string | null>(null);
  const [isSubmitting, startAddTransition] = useTransition();

  // Deletion transition
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [, startDeleteTransition] = useTransition();

  // Close menus on outer click
  useEffect(() => {
    const handleWindowClick = () => setActiveMenuId(null);
    window.addEventListener("click", handleWindowClick);
    return () => window.removeEventListener("click", handleWindowClick);
  }, []);

  // Keyboard navigation for Lightbox
  useEffect(() => {
    if (!lightbox.isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setLightbox((prev) => ({ ...prev, isOpen: false }));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightbox.isOpen]);

  const handleFileChange = (pose: PoseKey, file: File | null) => {
    setSelectedFiles((prev) => ({ ...prev, [pose]: file }));
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviews((prev) => ({ ...prev, [pose]: url }));
    } else {
      setPreviews((prev) => ({ ...prev, [pose]: null }));
    }
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const hasAny = Object.values(selectedFiles).some((f) => f !== null);
    if (!hasAny) {
      setAddError("Selecione pelo menos uma foto para enviar.");
      return;
    }

    setAddError(null);
    startAddTransition(async () => {
      const formData = new FormData();
      if (evalDateInput) formData.set("evaluationDate", evalDateInput);
      if (notesInput.trim()) formData.set("reviewerNotes", notesInput.trim());

      for (const pose of POSE_KEYS) {
        const file = selectedFiles[pose];
        if (file) {
          formData.set(`pose_${pose}`, file);
        }
      }

      const res = await addPhotoEvaluationAction(consultancySlug, studentPublicId, formData);
      if (res.success) {
        setIsAddModalOpen(false);
        setNotesInput("");
        setSelectedFiles({ FRONT: null, BACK: null, LEFT_SIDE: null, RIGHT_SIDE: null });
        setPreviews({ FRONT: null, BACK: null, LEFT_SIDE: null, RIGHT_SIDE: null });
      } else {
        setAddError(res.error || "Erro ao salvar fotos.");
      }
    });
  };

  const handleDeleteEvaluation = (requestPublicId: string) => {
    if (!confirm("Tem certeza que deseja excluir permanentemente esta avaliação de fotos?")) {
      return;
    }
    setDeletingId(requestPublicId);
    startDeleteTransition(async () => {
      await deletePhotoEvaluationAction(consultancySlug, studentPublicId, requestPublicId);
      setDeletingId(null);
    });
  };

  // Find image for pose in evaluation
  const getImageForPose = (item: PhotoEvaluationItem, poseKey: PoseKey) => {
    const aliases = POSE_CONFIG[poseKey].aliases;
    return item.images.find((img) => aliases.includes(img.pose)) || null;
  };

  const evalA = photos.find((p) => p.requestPublicId === compareEvalA);
  const evalB = photos.find((p) => p.requestPublicId === compareEvalB);

  return (
    <div className="space-y-6" data-testid="student-photos-mural">
      {/* 1. CABEÇALHO DA SEÇÃO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <DuotonePhotosIcon className="w-5 h-5 text-blue-500" />
            <h2 className="font-heading text-base font-bold text-[var(--text-primary)]">
              Evolução em fotos
            </h2>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Histórico fotográfico nas 4 poses padronizadas para acompanhamento corporal.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsCompareModalOpen(true)}
            disabled={photos.length < 2}
            className="font-semibold text-xs min-h-[40px] px-3.5 cursor-pointer disabled:opacity-40"
            title={photos.length < 2 ? "Necessário ter no mínimo 2 avaliações para comparar" : "Comparar avaliações"}
          >
            <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 4.5v15m6-15v15m-10.5-15h15a2.25 2.25 0 012.25 2.25v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75A2.25 2.25 0 014.5 4.5z" />
            </svg>
            <span>Comparar</span>
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={onRequestPhotosClick}
            className="font-semibold text-xs min-h-[40px] px-3.5 cursor-pointer"
          >
            <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
            <span>Solicitar fotos</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsAddModalOpen(true)}
            className="font-bold text-xs min-h-[40px] px-4 cursor-pointer bg-emerald-600 hover:bg-emerald-500 text-white"
          >
            <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span>Adicionar fotos</span>
          </Button>
        </div>
      </div>

      {/* 2. ESTADO VAZIO COMPACTO */}
      {photos.length === 0 ? (
        <div className="p-6 sm:p-8 rounded-2xl border border-[var(--border-default)] bg-white dark:bg-[#151619] text-center space-y-4 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-500 border border-blue-500/20 flex items-center justify-center mx-auto">
            <DuotonePhotosIcon className="w-6 h-6" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="font-heading text-sm font-bold text-[var(--text-primary)]">
              Nenhuma foto registrada para este aluno
            </h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Adicione fotos tiradas presencialmente ou solicite que o aluno envie as 4 poses padronizadas pelo app.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-1">
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsAddModalOpen(true)}
              className="font-bold min-h-[44px] px-5 bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              Adicionar fotos
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={onRequestPhotosClick}
              className="font-semibold min-h-[44px] px-4"
            >
              Solicitar fotos
            </Button>
          </div>
        </div>
      ) : (
        /* 3. MURAL CRONOLÓGICO DE AVALIAÇÕES */
        <div className="space-y-6">
          {photos.map((item, reqIdx) => {
            const displayDate = formatDisplayDate(
              item.evaluationDate || item.submittedAt || item.createdAt
            );
            const isMenuOpen = activeMenuId === item.requestPublicId;
            const isDeleting = deletingId === item.requestPublicId;

            return (
              <div
                key={item.requestPublicId}
                className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#151619] border border-[#E5E7EB] dark:border-[#26272B] shadow-xs space-y-4"
              >
                {/* Linha de Cabeçalho da Avaliação */}
                <div className="flex items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-3 relative">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-heading text-sm font-bold text-[var(--text-primary)]">
                      Avaliação de {displayDate}
                    </span>
                    <Badge
                      variant={item.status === "APPROVED" ? "success" : "neutral"}
                      size="sm"
                    >
                      {item.status === "APPROVED" ? "Aprovada" : item.status}
                    </Badge>
                    <span className="text-xs text-[var(--text-tertiary)]">
                      • {item.images.length} {item.images.length === 1 ? "pose registrada" : "poses registradas"}
                    </span>
                  </div>

                  {/* Menu de Ações Autorizadas */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenuId(isMenuOpen ? null : item.requestPublicId);
                      }}
                      className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer"
                      aria-label="Ações da avaliação"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <circle cx="12" cy="12" r="1.5" />
                        <circle cx="19" cy="12" r="1.5" />
                        <circle cx="5" cy="12" r="1.5" />
                      </svg>
                    </button>

                    {isMenuOpen && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute right-0 top-full mt-1 w-44 rounded-xl bg-white dark:bg-[#1C1E22] border border-[#E5E7EB] dark:border-[#2E3036] shadow-lg py-1 z-30 text-xs"
                      >
                        {photos.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              setActiveMenuId(null);
                              setCompareEvalB(item.requestPublicId);
                              setIsCompareModalOpen(true);
                            }}
                            className="w-full text-left px-3.5 py-2 text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] transition-colors font-medium flex items-center gap-2 cursor-pointer"
                          >
                            <svg className="w-3.5 h-3.5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 4.5v15m6-15v15" />
                            </svg>
                            <span>Comparar com...</span>
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={isDeleting}
                          onClick={() => {
                            setActiveMenuId(null);
                            handleDeleteEvaluation(item.requestPublicId);
                          }}
                          className="w-full text-left px-3.5 py-2 text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-colors font-medium flex items-center gap-2 cursor-pointer"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                          </svg>
                          <span>{isDeleting ? "Excluindo..." : "Excluir avaliação"}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Observações da Avaliação */}
                {item.reviewerNotes && (
                  <p className="text-xs text-[var(--text-secondary)] italic bg-[var(--surface-subtle)] p-2.5 rounded-xl border border-[var(--border-subtle)]">
                    Observação: {item.reviewerNotes}
                  </p>
                )}

                {/* Grid de 4 Poses Proporcionais 3:4 */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {POSE_KEYS.map((poseKey, poseIdx) => {
                    const img = getImageForPose(item, poseKey);
                    const poseLabel = POSE_CONFIG[poseKey].label;

                    if (!img) {
                      return (
                        <div
                          key={poseKey}
                          className="rounded-xl border border-dashed border-[var(--border-subtle)] bg-[var(--surface-subtle)]/40 p-2 space-y-1.5 flex flex-col items-center justify-center aspect-[3/4] text-center"
                        >
                          <svg className="w-5 h-5 text-[var(--text-tertiary)] opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                          </svg>
                          <span className="text-[10px] text-[var(--text-tertiary)] font-medium">
                            {poseLabel}
                          </span>
                          <span className="text-[9px] text-[var(--text-tertiary)] opacity-60">
                            Não enviada
                          </span>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={img.imagePublicId}
                        onClick={() =>
                          setLightbox({
                            isOpen: true,
                            imageUrl: img.imageUrl,
                            pose: poseLabel,
                            date: displayDate,
                            zoomLevel: 1,
                            requestIndex: reqIdx,
                            poseIndex: poseIdx,
                          })
                        }
                        className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)] p-2 space-y-1.5 overflow-hidden cursor-pointer hover:border-[var(--brand)] transition-colors group"
                      >
                        <div className="aspect-[3/4] rounded-lg overflow-hidden bg-black/10 dark:bg-black/30 relative flex items-center justify-center">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={img.imageUrl}
                            alt={`Pose ${poseLabel} - ${displayDate}`}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <span className="p-1.5 rounded-full bg-black/60 text-white">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6" />
                              </svg>
                            </span>
                          </div>
                        </div>
                        <p className="text-[11px] font-semibold text-[var(--text-primary)] text-center capitalize">
                          {poseLabel}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* =========================================================================
          MODAL: ADICIONAR FOTOS (Fluxo Presencial do Profissional)
          ========================================================================= */}
      {isAddModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-[#151619] border border-[#E5E7EB] dark:border-[#26272B] shadow-2xl p-6 sm:p-7 space-y-5"
          >
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <div>
                <h3 className="font-heading text-base font-bold text-[var(--text-primary)]">
                  Adicionar Fotos de Avaliação
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  Aluno selecionado: <strong className="text-[var(--text-primary)]">{studentName}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] transition-colors cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {addError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400">
                {addError}
              </div>
            )}

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Data da Avaliação *
                </label>
                <input
                  type="date"
                  value={evalDateInput}
                  onChange={(e) => setEvalDateInput(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)]"
                />
              </div>

              {/* 4 Poses Dropzone / Camera */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-[var(--text-secondary)]">
                  Poses Padronizadas (Selecione arquivo ou use a câmera)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {POSE_KEYS.map((poseKey) => {
                    const preview = previews[poseKey];
                    const label = POSE_CONFIG[poseKey].label;

                    return (
                      <div
                        key={poseKey}
                        className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] p-2 space-y-1.5 flex flex-col items-center justify-center text-center aspect-[3/4] relative overflow-hidden"
                      >
                        {preview ? (
                          <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={preview}
                              alt={label}
                              className="absolute inset-0 w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center p-2 opacity-0 hover:opacity-100 transition-opacity">
                              <button
                                type="button"
                                onClick={() => handleFileChange(poseKey, null)}
                                className="px-2 py-1 rounded bg-red-600 text-white text-[10px] font-bold cursor-pointer hover:bg-red-500"
                              >
                                Remover
                              </button>
                            </div>
                            <span className="absolute bottom-1 left-1 right-1 bg-black/60 text-white text-[9px] font-semibold py-0.5 rounded text-center">
                              {label}
                            </span>
                          </>
                        ) : (
                          <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer p-2 space-y-1 hover:bg-[var(--surface-hover)] transition-colors rounded-lg">
                            <svg className="w-6 h-6 text-[var(--text-tertiary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                            </svg>
                            <span className="text-[11px] font-bold text-[var(--text-primary)]">
                              {label}
                            </span>
                            <span className="text-[9px] text-[var(--brand)] font-semibold">
                              + Adicionar
                            </span>
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0] || null;
                                handleFileChange(poseKey, file);
                              }}
                            />
                          </label>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Observações do Profissional (Opcional)
                </label>
                <textarea
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  placeholder="Ex: Aluno em fase de corte calórico, retenção diminuída em tronco."
                  rows={2}
                  maxLength={500}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)] placeholder:text-[var(--text-tertiary)] resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsAddModalOpen(false)}
                  disabled={isSubmitting}
                  className="min-h-[44px]"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isSubmitting}
                  className="font-bold min-h-[44px] px-6 bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
                >
                  {isSubmitting ? "Registrando fotos..." : "Salvar avaliação"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: COMPARAR AVALIAÇÕES LADO A LADO
          ========================================================================= */}
      {isCompareModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-xs animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-3xl bg-white dark:bg-[#151619] border border-[#E5E7EB] dark:border-[#26272B] shadow-2xl p-5 sm:p-7 space-y-5"
          >
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <div>
                <h3 className="font-heading text-base font-bold text-[var(--text-primary)]">
                  Comparação Visual de Fotos
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  Aluno: <strong className="text-[var(--text-primary)]">{studentName}</strong> • Proporções originais 3:4
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCompareModalOpen(false)}
                className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] transition-colors cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Seletores de Avaliação A e B + Filtro de Poses */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
              <div>
                <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                  Avaliação A (Antes)
                </label>
                <select
                  value={compareEvalA}
                  onChange={(e) => setCompareEvalA(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[var(--border-default)] bg-white dark:bg-[#1A1C1F] text-xs text-[var(--text-primary)] font-semibold"
                >
                  {photos.map((p) => (
                    <option key={p.requestPublicId} value={p.requestPublicId}>
                      {formatDisplayDate(p.evaluationDate || p.submittedAt || p.createdAt)} ({p.images.length} fotos)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                  Avaliação B (Depois)
                </label>
                <select
                  value={compareEvalB}
                  onChange={(e) => setCompareEvalB(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[var(--border-default)] bg-white dark:bg-[#1A1C1F] text-xs text-[var(--text-primary)] font-semibold"
                >
                  {photos.map((p) => (
                    <option key={p.requestPublicId} value={p.requestPublicId}>
                      {formatDisplayDate(p.evaluationDate || p.submittedAt || p.createdAt)} ({p.images.length} fotos)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                  Filtrar Pose
                </label>
                <select
                  value={comparePoseFilter}
                  onChange={(e) => setComparePoseFilter(e.target.value as "ALL" | PoseKey)}
                  className="w-full px-3 py-2 rounded-xl border border-[var(--border-default)] bg-white dark:bg-[#1A1C1F] text-xs text-[var(--text-primary)] font-semibold"
                >
                  <option value="ALL">Todas as poses</option>
                  <option value="FRONT">Frente</option>
                  <option value="BACK">Costas</option>
                  <option value="LEFT_SIDE">Lateral Esquerda</option>
                  <option value="RIGHT_SIDE">Lateral Direita</option>
                </select>
              </div>
            </div>

            {/* Área de Comparação Lado a Lado */}
            <div className="space-y-6">
              {POSE_KEYS.filter((k) => comparePoseFilter === "ALL" || comparePoseFilter === k).map(
                (poseKey) => {
                  const label = POSE_CONFIG[poseKey].label;
                  const imgA = evalA ? getImageForPose(evalA, poseKey) : null;
                  const imgB = evalB ? getImageForPose(evalB, poseKey) : null;

                  return (
                    <div
                      key={poseKey}
                      className="p-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)] space-y-3"
                    >
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--brand)] text-center">
                        Pose: {label}
                      </h4>

                      <div className="grid grid-cols-2 gap-4">
                        {/* Imagem A */}
                        <div className="space-y-1.5 text-center">
                          <span className="text-[11px] font-semibold text-[var(--text-secondary)] block">
                            {evalA
                              ? formatDisplayDate(evalA.evaluationDate || evalA.submittedAt || evalA.createdAt)
                              : "Avaliação A"}
                          </span>
                          <div className="aspect-[3/4] max-w-[280px] mx-auto rounded-xl overflow-hidden bg-black/10 dark:bg-black/30 border border-[var(--border-subtle)] flex items-center justify-center">
                            {imgA ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img
                                src={imgA.imageUrl}
                                alt={`Pose ${label} - A`}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-xs text-[var(--text-tertiary)]">Sem foto</span>
                            )}
                          </div>
                        </div>

                        {/* Imagem B */}
                        <div className="space-y-1.5 text-center">
                          <span className="text-[11px] font-semibold text-[var(--text-secondary)] block">
                            {evalB
                              ? formatDisplayDate(evalB.evaluationDate || evalB.submittedAt || evalB.createdAt)
                              : "Avaliação B"}
                          </span>
                          <div className="aspect-[3/4] max-w-[280px] mx-auto rounded-xl overflow-hidden bg-black/10 dark:bg-black/30 border border-[var(--border-subtle)] flex items-center justify-center">
                            {imgB ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img
                                src={imgB.imageUrl}
                                alt={`Pose ${label} - B`}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-xs text-[var(--text-tertiary)]">Sem foto</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsCompareModalOpen(false)}
                className="min-h-[44px] px-6 font-bold"
              >
                Fechar comparação
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: LIGHTBOX COM ZOOM E NAVEGAÇÃO
          ========================================================================= */}
      {lightbox.isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/95 backdrop-blur-md animate-in fade-in"
        >
          {/* Barra Superior */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between text-white z-20">
            <div>
              <p className="text-sm font-bold">Pose: {lightbox.pose}</p>
              <p className="text-xs text-white/70">Data: {lightbox.date}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setLightbox((prev) => ({
                    ...prev,
                    zoomLevel: prev.zoomLevel === 1 ? 1.5 : prev.zoomLevel === 1.5 ? 2 : 1,
                  }))
                }
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-colors cursor-pointer"
              >
                Zoom: {lightbox.zoomLevel}x
              </button>
              <button
                type="button"
                onClick={() => setLightbox((prev) => ({ ...prev, isOpen: false }))}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                aria-label="Fechar visualizador"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Área da Imagem */}
          <div className="w-full h-full flex items-center justify-center overflow-auto p-4 pt-16">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightbox.imageUrl}
              alt={`Pose ${lightbox.pose} - ${lightbox.date}`}
              style={{
                transform: `scale(${lightbox.zoomLevel})`,
                transition: "transform 0.2s ease",
              }}
              className="max-h-[82vh] max-w-[90vw] object-contain rounded-xl shadow-2xl cursor-zoom-in"
              onClick={() =>
                setLightbox((prev) => ({
                  ...prev,
                  zoomLevel: prev.zoomLevel === 1 ? 1.5 : prev.zoomLevel === 1.5 ? 2 : 1,
                }))
              }
            />
          </div>
        </div>
      )}
    </div>
  );
}
