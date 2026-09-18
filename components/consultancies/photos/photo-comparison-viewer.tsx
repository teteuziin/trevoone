/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  POSE_LABELS,
  EVALUATION_POSES,
  type PhotoEvaluationPose,
  type PhotoEvaluationComparisonDto,
} from "@/types/photo-evaluations";

interface PhotoComparisonViewerProps {
  comparisonData: PhotoEvaluationComparisonDto;
  onClose?: () => void;
}

export function PhotoComparisonViewer({ comparisonData, onClose }: PhotoComparisonViewerProps) {
  const [selectedPose, setSelectedPose] = useState<PhotoEvaluationPose | "ALL">("ALL");
  const [zoomImage, setZoomImage] = useState<{ url: string; title: string } | null>(null);

  const { beforeEvaluation, afterEvaluation, pairs, student } = comparisonData;

  if (!beforeEvaluation || !afterEvaluation || pairs.length === 0) {
    return (
      <div className="p-8 text-center space-y-3 bg-[var(--surface-subtle)] border border-[var(--border-default)] rounded-2xl">
        <div className="w-12 h-12 rounded-full bg-[var(--brand-soft)] text-[var(--brand-foreground)] mx-auto flex items-center justify-center font-bold">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        </div>
        <h3 className="text-base font-semibold text-[var(--text-primary)]">
          Comparação Indisponível
        </h3>
        <p className="text-xs text-[var(--text-secondary)] max-w-md mx-auto">
          São necessárias pelo menos duas avaliações aprovadas do aluno para realizar o comparativo lado a lado.
        </p>
        {onClose && (
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Fechar
          </Button>
        )}
      </div>
    );
  }

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

  const visiblePairs = selectedPose === "ALL" ? pairs : pairs.filter((p) => p.pose === selectedPose);

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-[var(--surface-subtle)] border border-[var(--border-default)] rounded-2xl">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--brand-foreground)] bg-[var(--brand-soft)] px-2 py-0.5 rounded-md border border-[var(--brand-soft-border)]">
            Comparador Lado a Lado
          </span>
          <h3 className="text-base font-semibold text-[var(--text-primary)] mt-1">
            Evolução de {student.fullName}
          </h3>
          <p className="text-xs text-[var(--text-secondary)]">
            Comparação fotográfica visual padronizada (anterior vs atual).
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Pose Selector Tabs */}
          <div className="inline-flex items-center bg-[var(--surface-sunken)] border border-[var(--border-default)] rounded-xl p-1 gap-1">
            <button
              type="button"
              onClick={() => setSelectedPose("ALL")}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                selectedPose === "ALL"
                  ? "bg-[var(--surface)] text-[var(--text-primary)] shadow-xs border border-[var(--border-default)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              Todas as poses
            </button>
            {EVALUATION_POSES.map((pose) => (
              <button
                key={pose}
                type="button"
                onClick={() => setSelectedPose(pose)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                  selectedPose === pose
                    ? "bg-[var(--surface)] text-[var(--text-primary)] shadow-xs border border-[var(--border-default)]"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                {POSE_LABELS[pose]}
              </button>
            ))}
          </div>

          {onClose && (
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Fechar
            </Button>
          )}
        </div>
      </div>

      {/* Grid of Pose Pairs */}
      <div className="space-y-6">
        {visiblePairs.map((pair) => (
          <div
            key={pair.pose}
            className="p-4 sm:p-5 bg-[var(--surface)] border border-[var(--border-default)] rounded-2xl shadow-xs space-y-4"
          >
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[var(--brand)]" />
                <h4 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wide">
                  Pose: {pair.poseLabel}
                </h4>
              </div>
              <span className="text-xs text-[var(--text-tertiary)]">
                Alinhamento 1:1 rigoroso
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Before Card */}
              <div className="space-y-2 bg-[var(--surface-subtle)] p-3 rounded-xl border border-[var(--border-subtle)]">
                <div className="flex items-center justify-between">
                  <Badge variant="neutral" size="sm">
                    Anterior • {formatDate(beforeEvaluation.submittedAt || beforeEvaluation.reviewedAt)}
                  </Badge>
                  {pair.beforeImage && (
                    <button
                      type="button"
                      onClick={() =>
                        setZoomImage({
                          url: pair.beforeImage!.imageUrl,
                          title: `Anterior (${formatDate(beforeEvaluation.submittedAt || beforeEvaluation.reviewedAt)}) - ${pair.poseLabel}`,
                        })
                      }
                      className="text-xs text-[var(--brand-foreground)] hover:underline flex items-center gap-1 font-medium"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                      </svg>
                      Ampliar
                    </button>
                  )}
                </div>

                <div className="relative aspect-3/4 rounded-lg overflow-hidden bg-black/5 border border-[var(--border-default)] flex items-center justify-center">
                  {pair.beforeImage ? (
                    <img
                      src={pair.beforeImage.imageUrl}
                      alt={`Foto Anterior - ${pair.poseLabel}`}
                      className="w-full h-full object-cover cursor-pointer hover:scale-102 transition-transform duration-200"
                      onClick={() =>
                        setZoomImage({
                          url: pair.beforeImage!.imageUrl,
                          title: `Anterior (${formatDate(beforeEvaluation.submittedAt || beforeEvaluation.reviewedAt)}) - ${pair.poseLabel}`,
                        })
                      }
                      loading="lazy"
                    />
                  ) : (
                    <span className="text-xs text-[var(--text-tertiary)]">Sem foto para esta pose</span>
                  )}
                </div>
              </div>

              {/* After Card */}
              <div className="space-y-2 bg-[var(--surface-subtle)] p-3 rounded-xl border border-[var(--brand-soft-border)]">
                <div className="flex items-center justify-between">
                  <Badge variant="brand" size="sm">
                    Atual • {formatDate(afterEvaluation.submittedAt || afterEvaluation.reviewedAt)}
                  </Badge>
                  {pair.afterImage && (
                    <button
                      type="button"
                      onClick={() =>
                        setZoomImage({
                          url: pair.afterImage!.imageUrl,
                          title: `Atual (${formatDate(afterEvaluation.submittedAt || afterEvaluation.reviewedAt)}) - ${pair.poseLabel}`,
                        })
                      }
                      className="text-xs text-[var(--brand-foreground)] hover:underline flex items-center gap-1 font-medium"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                      </svg>
                      Ampliar
                    </button>
                  )}
                </div>

                <div className="relative aspect-3/4 rounded-lg overflow-hidden bg-black/5 border border-[var(--border-default)] flex items-center justify-center">
                  {pair.afterImage ? (
                    <img
                      src={pair.afterImage.imageUrl}
                      alt={`Foto Atual - ${pair.poseLabel}`}
                      className="w-full h-full object-cover cursor-pointer hover:scale-102 transition-transform duration-200"
                      onClick={() =>
                        setZoomImage({
                          url: pair.afterImage!.imageUrl,
                          title: `Atual (${formatDate(afterEvaluation.submittedAt || afterEvaluation.reviewedAt)}) - ${pair.poseLabel}`,
                        })
                      }
                      loading="lazy"
                    />
                  ) : (
                    <span className="text-xs text-[var(--text-tertiary)]">Sem foto para esta pose</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox / Zoom Modal */}
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
                aria-label="Fechar ampliação"
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
