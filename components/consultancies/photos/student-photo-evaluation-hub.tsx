/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PhotoEvaluationTutorialDrawer } from "./photo-evaluation-tutorial-drawer";
import { PhotoComparisonViewer } from "./photo-comparison-viewer";
import { submitPhotoEvaluationAction } from "@/app/consultoria/[slug]/progresso/fotos-actions";
import {
  EVALUATION_POSES,
  POSE_LABELS,
  POSE_DESCRIPTIONS,
  MAX_EVALUATION_PHOTO_SIZE_BYTES,
  type PhotoEvaluationPose,
  type PhotoEvaluationRequestDto,
  type PhotoEvaluationComparisonDto,
} from "@/types/photo-evaluations";

interface StudentPhotoEvaluationHubProps {
  consultancySlug: string;
  activeRequest: PhotoEvaluationRequestDto | null;
  history: PhotoEvaluationRequestDto[];
  comparisonData: PhotoEvaluationComparisonDto | null;
}

export function StudentPhotoEvaluationHub({
  consultancySlug,
  activeRequest,
  history,
  comparisonData,
}: StudentPhotoEvaluationHubProps) {
  const [requestState, setRequestState] = useState<PhotoEvaluationRequestDto | null>(activeRequest);
  const [uploadingPose, setUploadingPose] = useState<PhotoEvaluationPose | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [hasConsented, setHasConsented] = useState(false);
  const [isPendingSubmit, startSubmitTransition] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [showComparison, setShowComparison] = useState(false);

  // File upload handler per pose
  const handleFileUpload = async (pose: PhotoEvaluationPose, file: File) => {
    if (!requestState) return;

    setUploadError(null);
    setSubmitError(null);

    if (file.size > MAX_EVALUATION_PHOTO_SIZE_BYTES) {
      setUploadError("O arquivo excede o limite máximo permitido de 10 MB.");
      return;
    }

    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      setUploadError("Formato inválido. Selecione uma imagem em JPG, PNG ou WEBP.");
      return;
    }

    setUploadingPose(pose);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(
        `/api/consultancies/${consultancySlug}/photo-evaluations/${requestState.publicId}/images/${pose}`,
        {
          method: "POST",
          body: formData,
        }
      );

      const json = await res.json();

      if (!res.ok || !json.success) {
        setUploadError(json.error || "Erro ao enviar a imagem. Tente novamente.");
        return;
      }

      // Update local state with the newly uploaded image
      setRequestState((prev) => {
        if (!prev) return null;
        const newImages = {
          ...prev.images,
          [pose]: json.image,
        };
        const completedCount = EVALUATION_POSES.filter((p) => newImages[p] !== null).length;
        return {
          ...prev,
          images: newImages,
          completedPosesCount: completedCount,
        };
      });
    } catch {
      setUploadError("Falha de conexão ao enviar a foto. Verifique sua internet.");
    } finally {
      setUploadingPose(null);
    }
  };

  // Check retake validity for each pose
  const isRetakeRequired = (pose: PhotoEvaluationPose): boolean => {
    if (!requestState || requestState.status !== "CHANGES_REQUESTED") return false;
    return requestState.requestedChangesPoses.includes(pose);
  };

  const isRetakePending = (pose: PhotoEvaluationPose): boolean => {
    if (!requestState || requestState.status !== "CHANGES_REQUESTED") return false;
    if (!requestState.requestedChangesPoses.includes(pose)) return false;
    const img = requestState.images[pose];
    if (!img || !requestState.reviewedAt) return true;
    return new Date(img.updatedAt).getTime() <= new Date(requestState.reviewedAt).getTime();
  };

  const hasAnyPendingRetake = (): boolean => {
    if (!requestState || requestState.status !== "CHANGES_REQUESTED") return false;
    return requestState.requestedChangesPoses.some((p) => isRetakePending(p));
  };

  // Submit action
  const handleSubmit = () => {
    if (!requestState) return;
    setSubmitError(null);

    if (requestState.completedPosesCount < 4) {
      setSubmitError("É obrigatório carregar as 4 poses antes de enviar.");
      return;
    }

    if (hasAnyPendingRetake()) {
      setSubmitError("Substitua todas as fotos marcadas para correção antes de reenviar.");
      return;
    }

    if (!hasConsented) {
      setSubmitError("Você precisa confirmar o termo de consentimento antes de enviar.");
      return;
    }

    startSubmitTransition(async () => {
      const formData = new FormData();
      formData.append("consultancySlug", consultancySlug);
      formData.append("requestPublicId", requestState.publicId);
      formData.append("hasAgreedToGuidelines", "true");

      const res = await submitPhotoEvaluationAction(null, formData);
      if (!res.success) {
        setSubmitError(res.error || "Erro ao enviar a avaliação.");
      } else {
        setSubmitSuccess(true);
        setRequestState((prev) => (prev ? { ...prev, status: "SUBMITTED", statusLabel: "Em análise" } : null));
      }
    });
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return "";
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

  return (
    <div className="space-y-6">
      {/* Top Banner / Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-[var(--surface)] border border-[var(--border-default)] rounded-2xl shadow-xs">
        <div>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            Fotos de Avaliação Física
          </h3>
          <p className="text-xs text-[var(--text-secondary)]">
            Registro visual seguro e privado para acompanhamento postural e estético.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <PhotoEvaluationTutorialDrawer />
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
              {showComparison ? "Ver Fotos Atuais" : "Comparar Evolução"}
            </Button>
          )}
        </div>
      </div>

      {/* Comparison View (if toggled) */}
      {showComparison && comparisonData && (
        <div className="animate-in fade-in duration-200">
          <PhotoComparisonViewer
            comparisonData={comparisonData}
            onClose={() => setShowComparison(false)}
          />
        </div>
      )}

      {/* Main Flow (if comparison is not active) */}
      {!showComparison && (
        <>
          {/* Active Request Section */}
          {requestState ? (
            <div className="space-y-6">
              {/* Status Header Card */}
              <div
                className={`p-5 rounded-2xl border shadow-xs transition-colors ${
                  requestState.status === "CHANGES_REQUESTED"
                    ? "bg-[var(--warning-soft)] border-[var(--warning-border)]"
                    : requestState.status === "SUBMITTED"
                    ? "bg-[var(--info-soft)] border-[var(--info-border)]"
                    : "bg-[var(--surface)] border-[var(--border-default)]"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          requestState.status === "CHANGES_REQUESTED"
                            ? "warning"
                            : requestState.status === "SUBMITTED"
                            ? "info"
                            : "neutral"
                        }
                        size="md"
                        dot
                      >
                        {requestState.statusLabel}
                      </Badge>
                      {requestState.dueAt && (
                        <span className="text-xs text-[var(--text-secondary)]">
                          Prazo sugerido: {formatDate(requestState.dueAt)}
                        </span>
                      )}
                    </div>

                    <h4 className="text-sm font-semibold text-[var(--text-primary)]">
                      Solicitado por {requestState.requestedByName}
                    </h4>

                    {requestState.instructions && (
                      <p className="text-xs text-[var(--text-secondary)] mt-1 bg-[var(--surface)] p-2.5 rounded-lg border border-[var(--border-subtle)] leading-relaxed">
                        <span className="font-semibold text-[var(--text-primary)]">Orientações do profissional: </span>
                        {requestState.instructions}
                      </p>
                    )}

                    {requestState.status === "CHANGES_REQUESTED" && requestState.reviewerNotes && (
                      <div className="p-3 bg-[var(--surface)] border border-[var(--warning-border)] rounded-xl mt-2">
                        <span className="text-xs font-bold text-[var(--warning-foreground)] block">
                          Motivo da solicitação de correção:
                        </span>
                        <p className="text-xs text-[var(--text-primary)] mt-0.5 leading-relaxed">
                          {requestState.reviewerNotes}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Progress Indicator */}
                  <div className="sm:text-right shrink-0">
                    <span className="text-xs font-semibold text-[var(--text-secondary)] block">
                      Progresso das fotos
                    </span>
                    <span className="text-lg font-bold text-[var(--brand-foreground)]">
                      {requestState.completedPosesCount} de 4
                    </span>
                    <span className="text-[11px] text-[var(--text-tertiary)] block">
                      concluídas
                    </span>
                  </div>
                </div>
              </div>

              {uploadError && (
                <div className="p-3.5 bg-[var(--danger-soft)] border border-[var(--danger-border)] text-[var(--danger-foreground)] rounded-xl text-xs flex items-center gap-2">
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{uploadError}</span>
                </div>
              )}

              {/* 4 Poses Upload Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {EVALUATION_POSES.map((pose) => {
                  const image = requestState.images[pose];
                  const isRetake = isRetakeRequired(pose);
                  const isPendingFix = isRetakePending(pose);
                  const isUploading = uploadingPose === pose;
                  const canEdit = requestState.status === "PENDING" || requestState.status === "CHANGES_REQUESTED";

                  return (
                    <div
                      key={pose}
                      className={`flex flex-col bg-[var(--surface)] border rounded-2xl overflow-hidden shadow-xs transition-all ${
                        isPendingFix
                          ? "border-[var(--warning-border)] ring-1 ring-[var(--warning-border)]"
                          : "border-[var(--border-default)]"
                      }`}
                    >
                      {/* Card Header */}
                      <div className="p-3 border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold text-[var(--text-primary)] block">
                            {POSE_LABELS[pose]}
                          </span>
                        </div>
                        {isPendingFix ? (
                          <Badge variant="warning" size="sm">
                            Refazer foto
                          </Badge>
                        ) : isRetake && !isPendingFix ? (
                          <Badge variant="success" size="sm">
                            Substituída ✓
                          </Badge>
                        ) : image ? (
                          <Badge variant="brand" size="sm">
                            Pronta ✓
                          </Badge>
                        ) : (
                          <Badge variant="neutral" size="sm">
                            Pendente
                          </Badge>
                        )}
                      </div>

                      {/* Image Preview / Placeholder Area */}
                      <div className="relative aspect-3/4 bg-[var(--surface-sunken)] flex items-center justify-center overflow-hidden">
                        {isUploading ? (
                          <div className="flex flex-col items-center gap-2 text-xs text-[var(--brand-foreground)] font-medium">
                            <div className="w-6 h-6 border-2 border-[var(--brand)] border-t-transparent rounded-full animate-spin" />
                            <span>Enviando...</span>
                          </div>
                        ) : image ? (
                          <img
                            src={image.imageUrl}
                            alt={image.poseLabel}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="p-4 text-center space-y-2">
                            <div className="w-10 h-10 mx-auto rounded-full bg-[var(--surface)] border border-[var(--border-default)] flex items-center justify-center text-[var(--text-tertiary)]">
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                              </svg>
                            </div>
                            <span className="text-[11px] text-[var(--text-tertiary)] block">
                              Nenhuma foto anexada
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Card Footer with Upload / Replace Actions */}
                      <div className="p-3 border-t border-[var(--border-subtle)] space-y-2">
                        <p className="text-[11px] text-[var(--text-secondary)] line-clamp-2">
                          {POSE_DESCRIPTIONS[pose]}
                        </p>

                        {canEdit && (
                          <label className="block w-full">
                            <span
                              className={`w-full py-1.5 px-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-colors border ${
                                isPendingFix
                                  ? "bg-[var(--warning-soft)] text-[var(--warning-foreground)] border-[var(--warning-border)] hover:bg-[var(--warning-hover)]"
                                  : image
                                  ? "bg-[var(--surface-subtle)] text-[var(--text-secondary)] border-[var(--border-default)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                                  : "bg-[var(--brand)] text-white border-[var(--brand)] hover:opacity-95"
                              }`}
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                              </svg>
                              {image ? "Substituir foto" : "Tirar / Escolher foto"}
                            </span>
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              className="hidden"
                              disabled={isUploading}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  handleFileUpload(pose, file);
                                }
                              }}
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Submission Area (when can edit) */}
              {(requestState.status === "PENDING" || requestState.status === "CHANGES_REQUESTED") && (
                <div className="p-5 bg-[var(--surface)] border border-[var(--border-default)] rounded-2xl shadow-xs space-y-4">
                  {/* Privacy & Consent Card */}
                  <div className="flex items-start gap-3 p-3.5 bg-[var(--surface-subtle)] border border-[var(--border-subtle)] rounded-xl">
                    <input
                      type="checkbox"
                      id="photo-evaluation-consent"
                      checked={hasConsented}
                      onChange={(e) => setHasConsented(e.target.checked)}
                      className="w-4 h-4 mt-0.5 rounded border-[var(--border-default)] text-[var(--brand)] focus:ring-[var(--brand)] cursor-pointer"
                    />
                    <label
                      htmlFor="photo-evaluation-consent"
                      className="text-xs text-[var(--text-secondary)] leading-relaxed cursor-pointer select-none"
                    >
                      <strong className="text-[var(--text-primary)]">Termo de Privacidade e Uso: </strong>
                      Declaro que estas fotos são para fins exclusivos de avaliação física e acompanhamento profissional,
                      autorizando a visualização pelos profissionais responsáveis pela minha consultoria.
                    </label>
                  </div>

                  {submitError && (
                    <div className="p-3 bg-[var(--danger-soft)] border border-[var(--danger-border)] text-[var(--danger-foreground)] rounded-xl text-xs flex items-center gap-2">
                      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{submitError}</span>
                    </div>
                  )}

                  {submitSuccess && (
                    <div className="p-3 bg-[var(--success-soft)] border border-[var(--success-border)] text-[var(--success-foreground)] rounded-xl text-xs flex items-center gap-2">
                      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Avaliação enviada com sucesso! Seu profissional foi notificado.</span>
                    </div>
                  )}

                  {/* Submission Button */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                    <span className="text-xs text-[var(--text-tertiary)]">
                      Tamanho máximo por foto: 10 MB (JPG, PNG, WEBP).
                    </span>

                    <Button
                      type="button"
                      variant="primary"
                      size="md"
                      disabled={
                        requestState.completedPosesCount < 4 ||
                        hasAnyPendingRetake() ||
                        !hasConsented ||
                        isPendingSubmit
                      }
                      onClick={handleSubmit}
                      className="gap-2 font-semibold"
                    >
                      {isPendingSubmit ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Enviando avaliação...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Enviar Avaliação Completa
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 text-center bg-[var(--surface)] border border-[var(--border-default)] rounded-2xl shadow-xs space-y-3">
              <div className="w-12 h-12 rounded-full bg-[var(--brand-soft)] text-[var(--brand-foreground)] mx-auto flex items-center justify-center font-bold">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                </svg>
              </div>
              <h4 className="text-base font-semibold text-[var(--text-primary)]">
                Nenhuma solicitação de fotos em aberto
              </h4>
              <p className="text-xs text-[var(--text-secondary)] max-w-md mx-auto">
                Quando seu personal ou nutricionista solicitar novas fotos de avaliação física, elas aparecerão aqui para envio.
              </p>
            </div>
          )}

          {/* Past Approved Evaluations Section */}
          {history.length > 0 && (
            <div className="space-y-4 pt-6 border-t border-[var(--border-subtle)]">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  Histórico de Avaliações Aprovadas ({history.length})
                </h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {history.map((evalItem) => (
                  <div
                    key={evalItem.publicId}
                    className="p-4 bg-[var(--surface)] border border-[var(--border-default)] rounded-2xl shadow-xs space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-semibold text-[var(--text-primary)] block">
                          Avaliação de {formatDate(evalItem.submittedAt || evalItem.reviewedAt)}
                        </span>
                        <span className="text-[11px] text-[var(--text-tertiary)]">
                          Aprovada por {evalItem.reviewedByName || "Profissional"}
                        </span>
                      </div>
                      <Badge variant="success" size="sm">
                        Aprovada
                      </Badge>
                    </div>

                    {evalItem.reviewerNotes && (
                      <p className="text-xs text-[var(--text-secondary)] bg-[var(--surface-subtle)] p-2 rounded-lg border border-[var(--border-subtle)]">
                        <span className="font-semibold text-[var(--text-primary)]">Parecer: </span>
                        {evalItem.reviewerNotes}
                      </p>
                    )}

                    {/* 4 Poses Mini Preview */}
                    <div className="grid grid-cols-4 gap-2 pt-1">
                      {EVALUATION_POSES.map((p) => {
                        const img = evalItem.images[p];
                        return (
                          <div
                            key={p}
                            className="aspect-3/4 rounded-lg overflow-hidden bg-[var(--surface-sunken)] border border-[var(--border-subtle)]"
                          >
                            {img ? (
                              <img
                                src={img.imageUrl}
                                alt={POSE_LABELS[p]}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[10px] text-[var(--text-tertiary)]">
                                -
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
