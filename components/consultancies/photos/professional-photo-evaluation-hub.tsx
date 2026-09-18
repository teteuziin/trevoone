/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PhotoComparisonViewer } from "./photo-comparison-viewer";
import {
  createPhotoEvaluationRequestAction,
  reviewPhotoEvaluationAction,
} from "@/app/consultoria/[slug]/progresso/fotos-actions";
import {
  EVALUATION_POSES,
  POSE_LABELS,
  type PhotoEvaluationPose,
  type PhotoEvaluationRequestDto,
  type PhotoEvaluationComparisonDto,
} from "@/types/photo-evaluations";

interface ProfessionalPhotoEvaluationHubProps {
  consultancySlug: string;
  student: {
    publicId: string;
    fullName: string;
    email: string;
  };
  requests: PhotoEvaluationRequestDto[];
  comparisonData: PhotoEvaluationComparisonDto | null;
}

export function ProfessionalPhotoEvaluationHub({
  consultancySlug,
  student,
  requests,
  comparisonData,
}: ProfessionalPhotoEvaluationHubProps) {
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [instructions, setInstructions] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [isPendingCreate, startCreateTransition] = useTransition();
  const [createError, setCreateError] = useState<string | null>(null);

  // Review states
  const [activeReviewRequest, setActiveReviewRequest] = useState<PhotoEvaluationRequestDto | null>(null);
  const [reviewMode, setReviewMode] = useState<"APPROVE" | "CHANGES_REQUESTED" | null>(null);
  const [reviewerNotes, setReviewerNotes] = useState("");
  const [selectedPosesToRetake, setSelectedPosesToRetake] = useState<PhotoEvaluationPose[]>([]);
  const [isPendingReview, startReviewTransition] = useTransition();
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [zoomImage, setZoomImage] = useState<{ url: string; title: string } | null>(null);

  // Handle request creation
  const handleCreateRequest = () => {
    setCreateError(null);
    startCreateTransition(async () => {
      const formData = new FormData();
      formData.append("consultancySlug", consultancySlug);
      formData.append("studentPublicId", student.publicId);
      if (instructions.trim()) formData.append("instructions", instructions.trim());
      if (dueAt.trim()) formData.append("dueAt", dueAt.trim());

      const res = await createPhotoEvaluationRequestAction(null, formData);
      if (!res.success) {
        setCreateError(res.error || "Erro ao solicitar avaliação.");
      } else {
        setShowRequestModal(false);
        setInstructions("");
        setDueAt("");
      }
    });
  };

  // Handle review submission
  const handleExecuteReview = () => {
    if (!activeReviewRequest || !reviewMode) return;
    setReviewError(null);

    if (reviewMode === "CHANGES_REQUESTED" && selectedPosesToRetake.length === 0) {
      setReviewError("Selecione ao menos uma pose para solicitar que o aluno refaça.");
      return;
    }

    startReviewTransition(async () => {
      const formData = new FormData();
      formData.append("consultancySlug", consultancySlug);
      formData.append("requestPublicId", activeReviewRequest.publicId);
      formData.append("studentPublicId", student.publicId);
      formData.append("decision", reviewMode);
      if (reviewerNotes.trim()) formData.append("reviewerNotes", reviewerNotes.trim());
      for (const pose of selectedPosesToRetake) {
        formData.append("posesToRetake", pose);
      }

      const res = await reviewPhotoEvaluationAction(null, formData);
      if (!res.success) {
        setReviewError(res.error || "Erro ao registrar avaliação.");
      } else {
        setActiveReviewRequest(null);
        setReviewMode(null);
        setReviewerNotes("");
        setSelectedPosesToRetake([]);
      }
    });
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return "Data não informada";
    try {
      return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(new Date(iso));
    } catch {
      return iso;
    }
  };

  const hasActiveRequest = requests.some(
    (r) => r.status === "PENDING" || r.status === "CHANGES_REQUESTED" || r.status === "SUBMITTED"
  );

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-[var(--surface)] border border-[var(--border-default)] rounded-2xl shadow-xs">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--brand-foreground)] bg-[var(--brand-soft)] px-2 py-0.5 rounded-md border border-[var(--brand-soft-border)]">
            Acompanhamento Físico
          </span>
          <h3 className="text-base font-semibold text-[var(--text-primary)] mt-1">
            Fotos de Avaliação de {student.fullName}
          </h3>
          <p className="text-xs text-[var(--text-secondary)]">
            Solicite, revise e compare o histórico visual de evolução do aluno.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {comparisonData && comparisonData.pairs.length > 0 && (
            <Button
              type="button"
              variant={showComparison ? "primary" : "outline"}
              size="sm"
              onClick={() => setShowComparison(!showComparison)}
              className="text-xs font-semibold gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              {showComparison ? "Ver Solicitações" : "Comparar Evolução"}
            </Button>
          )}

          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled={hasActiveRequest}
            onClick={() => setShowRequestModal(true)}
            className="text-xs font-semibold gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Solicitar Fotos
          </Button>
        </div>
      </div>

      {/* Comparison View */}
      {showComparison && comparisonData && (
        <div className="animate-in fade-in duration-200">
          <PhotoComparisonViewer
            comparisonData={comparisonData}
            onClose={() => setShowComparison(false)}
          />
        </div>
      )}

      {/* Requests List */}
      {!showComparison && (
        <div className="space-y-6">
          {requests.length === 0 ? (
            <div className="p-8 text-center bg-[var(--surface)] border border-[var(--border-default)] rounded-2xl shadow-xs space-y-3">
              <div className="w-12 h-12 rounded-full bg-[var(--brand-soft)] text-[var(--brand-foreground)] mx-auto flex items-center justify-center font-bold">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                </svg>
              </div>
              <h4 className="text-base font-semibold text-[var(--text-primary)]">
                Nenhuma avaliação por fotos solicitada
              </h4>
              <p className="text-xs text-[var(--text-secondary)] max-w-md mx-auto">
                Clique em &quot;Solicitar Fotos&quot; acima para enviar uma solicitação com as 4 poses padronizadas para este aluno.
              </p>
            </div>
          ) : (
            requests.map((req) => {
              const isSubmitted = req.status === "SUBMITTED";
              const isApproved = req.status === "APPROVED";
              const isChangesRequested = req.status === "CHANGES_REQUESTED";

              return (
                <div
                  key={req.publicId}
                  className={`p-5 rounded-2xl border shadow-xs space-y-5 transition-all ${
                    isSubmitted
                      ? "bg-[var(--surface)] border-[var(--brand)] ring-1 ring-[var(--brand)]"
                      : "bg-[var(--surface)] border-[var(--border-default)]"
                  }`}
                >
                  {/* Request Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            isApproved
                              ? "success"
                              : isSubmitted
                              ? "brand"
                              : isChangesRequested
                              ? "warning"
                              : "neutral"
                          }
                          size="md"
                          dot
                        >
                          {req.statusLabel}
                        </Badge>
                        <span className="text-xs text-[var(--text-tertiary)]">
                          Solicitado em {formatDate(req.createdAt)} por {req.requestedByName}
                        </span>
                      </div>

                      {req.instructions && (
                        <p className="text-xs text-[var(--text-secondary)] mt-1">
                          <span className="font-semibold text-[var(--text-primary)]">Orientações enviadas: </span>
                          {req.instructions}
                        </p>
                      )}

                      {req.reviewerNotes && (
                        <p className="text-xs text-[var(--text-secondary)] mt-1 bg-[var(--surface-subtle)] p-2 rounded-lg border border-[var(--border-subtle)]">
                          <span className="font-semibold text-[var(--text-primary)]">Parecer do profissional: </span>
                          {req.reviewerNotes}
                        </p>
                      )}
                    </div>

                    {isSubmitted && (
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          setActiveReviewRequest(req);
                          setReviewMode(null);
                        }}
                        className="font-semibold gap-1.5 self-start sm:self-auto"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Avaliar Fotos Enviadas
                      </Button>
                    )}
                  </div>

                  {/* 4 Poses Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {EVALUATION_POSES.map((pose) => {
                      const img = req.images[pose];
                      const isFlagged = req.requestedChangesPoses.includes(pose);

                      return (
                        <div
                          key={pose}
                          className="bg-[var(--surface-subtle)] border border-[var(--border-subtle)] rounded-xl overflow-hidden flex flex-col"
                        >
                          <div className="p-2 border-b border-[var(--border-subtle)] flex items-center justify-between text-[11px] font-semibold text-[var(--text-primary)]">
                            <span>{POSE_LABELS[pose]}</span>
                            {isFlagged && (
                              <Badge variant="warning" size="sm">
                                Ajuste
                              </Badge>
                            )}
                          </div>

                          <div className="relative aspect-3/4 bg-[var(--surface-sunken)] flex items-center justify-center overflow-hidden">
                            {img ? (
                              <img
                                src={img.imageUrl}
                                alt={POSE_LABELS[pose]}
                                className="w-full h-full object-cover cursor-pointer hover:scale-103 transition-transform"
                                onClick={() =>
                                  setZoomImage({
                                    url: img.imageUrl,
                                    title: `${student.fullName} - ${POSE_LABELS[pose]}`,
                                  })
                                }
                                loading="lazy"
                              />
                            ) : (
                              <span className="text-[11px] text-[var(--text-tertiary)]">
                                Não enviada
                              </span>
                            )}
                          </div>

                          {img && (
                            <div className="p-1.5 text-center bg-[var(--surface)] border-t border-[var(--border-subtle)]">
                              <button
                                type="button"
                                onClick={() =>
                                  setZoomImage({
                                    url: img.imageUrl,
                                    title: `${student.fullName} - ${POSE_LABELS[pose]}`,
                                  })
                                }
                                className="text-[11px] text-[var(--brand-foreground)] hover:underline font-medium"
                              >
                                Ampliar foto
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Review Modal / Drawer */}
      {activeReviewRequest && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="relative w-full max-w-xl flex flex-col bg-[var(--surface)] border border-[var(--border-default)] rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)]">
              <div>
                <h3 className="text-base font-semibold text-[var(--text-primary)]">
                  Revisão da Avaliação por Fotos
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  Aluno: {student.fullName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveReviewRequest(null)}
                className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] p-1.5 rounded-lg"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
              {/* Decision Choice */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  Decisão da Avaliação *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setReviewMode("APPROVE")}
                    className={`p-3.5 rounded-xl border text-left transition-all ${
                      reviewMode === "APPROVE"
                        ? "bg-[var(--success-soft)] border-[var(--success)] text-[var(--success-foreground)] ring-1 ring-[var(--success)] font-semibold"
                        : "bg-[var(--surface-subtle)] border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-[var(--success)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-xs font-bold">Aprovar Avaliação</span>
                    </div>
                    <p className="text-[11px] mt-1 text-[var(--text-tertiary)]">
                      As 4 fotos cumprem o padrão exigido.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setReviewMode("CHANGES_REQUESTED")}
                    className={`p-3.5 rounded-xl border text-left transition-all ${
                      reviewMode === "CHANGES_REQUESTED"
                        ? "bg-[var(--warning-soft)] border-[var(--warning)] text-[var(--warning-foreground)] ring-1 ring-[var(--warning)] font-semibold"
                        : "bg-[var(--surface-subtle)] border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-[var(--warning)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <span className="text-xs font-bold">Solicitar Correção</span>
                    </div>
                    <p className="text-[11px] mt-1 text-[var(--text-tertiary)]">
                      Pedir que o aluno refaça fotos específicas.
                    </p>
                  </button>
                </div>
              </div>

              {/* Poses Checklist (if CHANGES_REQUESTED) */}
              {reviewMode === "CHANGES_REQUESTED" && (
                <div className="space-y-2 p-4 bg-[var(--warning-soft)] border border-[var(--warning-border)] rounded-xl">
                  <label className="text-xs font-bold text-[var(--warning-foreground)] block">
                    Selecione as fotos que o aluno precisa refazer:
                  </label>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {EVALUATION_POSES.map((pose) => {
                      const isChecked = selectedPosesToRetake.includes(pose);
                      return (
                        <label
                          key={pose}
                          className="flex items-center gap-2 p-2 bg-[var(--surface)] border border-[var(--border-subtle)] rounded-lg cursor-pointer hover:bg-[var(--surface-hover)]"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedPosesToRetake([...selectedPosesToRetake, pose]);
                              } else {
                                setSelectedPosesToRetake(selectedPosesToRetake.filter((p) => p !== pose));
                              }
                            }}
                            className="w-4 h-4 rounded text-[var(--brand)] border-[var(--border-default)]"
                          />
                          <span className="text-xs font-medium text-[var(--text-primary)]">
                            {POSE_LABELS[pose]}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Notes textarea */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  {reviewMode === "CHANGES_REQUESTED"
                    ? "Orientações para o aluno (Obrigatório) *"
                    : "Parecer ou observações (Opcional)"}
                </label>
                <textarea
                  value={reviewerNotes}
                  onChange={(e) => setReviewerNotes(e.target.value)}
                  rows={3}
                  placeholder={
                    reviewMode === "CHANGES_REQUESTED"
                      ? "Ex: A foto de perfil direito ficou com pouca luz e a câmera estava inclinada para cima. Por favor, refaça..."
                      : "Comentários sobre a evolução ou simetria..."
                  }
                  className="w-full p-3 bg-[var(--surface-subtle)] border border-[var(--border-default)] rounded-xl text-xs text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
                />
              </div>

              {reviewError && (
                <div className="p-3 bg-[var(--danger-soft)] border border-[var(--danger-border)] text-[var(--danger-foreground)] rounded-xl text-xs flex items-center gap-2">
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{reviewError}</span>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-[var(--border-subtle)] bg-[var(--surface-subtle)] flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setActiveReviewRequest(null)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                disabled={!reviewMode || isPendingReview}
                onClick={handleExecuteReview}
              >
                {isPendingReview ? "Salvando..." : "Confirmar Avaliação"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Request Modal */}
      {showRequestModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="relative w-full max-w-md bg-[var(--surface)] border border-[var(--border-default)] rounded-2xl shadow-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)]">
              <h3 className="text-base font-semibold text-[var(--text-primary)]">
                Solicitar Fotos de Avaliação
              </h3>
              <button
                type="button"
                onClick={() => setShowRequestModal(false)}
                className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] p-1 rounded-md"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-[var(--text-secondary)]">
                O aluno <strong>{student.fullName}</strong> receberá uma notificação para envio das 4 fotos padronizadas (Frente, Lado Direito, Costas, Lado Esquerdo).
              </p>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--text-primary)]">
                  Orientações adicionais (Opcional)
                </label>
                <textarea
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  rows={3}
                  placeholder="Ex: Por favor, tire as fotos em jejum pela manhã, usando roupa preta..."
                  className="w-full p-2.5 bg-[var(--surface-subtle)] border border-[var(--border-default)] rounded-xl text-xs text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--text-primary)]">
                  Prazo sugerido (Opcional)
                </label>
                <input
                  type="date"
                  value={dueAt}
                  onChange={(e) => setDueAt(e.target.value)}
                  className="w-full p-2 bg-[var(--surface-subtle)] border border-[var(--border-default)] rounded-xl text-xs text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
                />
              </div>

              {createError && (
                <div className="p-3 bg-[var(--danger-soft)] border border-[var(--danger-border)] text-[var(--danger-foreground)] rounded-xl text-xs">
                  {createError}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-[var(--border-subtle)] bg-[var(--surface-subtle)] flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowRequestModal(false)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                disabled={isPendingCreate}
                onClick={handleCreateRequest}
              >
                {isPendingCreate ? "Enviando solicitação..." : "Enviar Solicitação"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {zoomImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setZoomImage(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="relative max-w-4xl max-h-[90vh] flex flex-col bg-[var(--surface)] border border-[var(--border-default)] rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)]">
              <span className="text-xs font-semibold text-[var(--text-primary)]">
                {zoomImage.title}
              </span>
              <button
                type="button"
                onClick={() => setZoomImage(null)}
                className="p-1 rounded-md text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-2 overflow-auto flex items-center justify-center bg-black/90">
              <img
                src={zoomImage.url}
                alt={zoomImage.title}
                className="max-h-[80vh] max-w-full object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
