/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  EVALUATION_POSES,
  POSE_LABELS,
  type PhotoEvaluationPose,
} from "@/types/photo-evaluations";
import type {
  EvolutionComparisonDataDto,
  EvolutionMilestoneDto,
} from "@/types/evolution";

interface EvolutionComparatorProps {
  initialComparisonData: EvolutionComparisonDataDto;
  allMilestones: EvolutionMilestoneDto[];
  onSelectDates?: (beforeDate: string, afterDate: string) => void;
  onClose?: () => void;
}

export function EvolutionComparator({
  initialComparisonData,
  allMilestones,
  onSelectDates,
  onClose,
}: EvolutionComparatorProps) {
  const [selectedPose, setSelectedPose] = useState<PhotoEvaluationPose | "ALL">("ALL");
  const [zoomImage, setZoomImage] = useState<{ url: string; title: string } | null>(null);

  const { beforeMilestone, afterMilestone, daysBetween, metricsComparison, photoPairs, student } =
    initialComparisonData;

  const [beforeDate, setBeforeDate] = useState<string>(
    beforeMilestone?.date || (allMilestones.length > 1 ? allMilestones[allMilestones.length - 1].date : "")
  );
  const [afterDate, setAfterDate] = useState<string>(
    afterMilestone?.date || (allMilestones.length > 0 ? allMilestones[0].date : "")
  );

  const handleApplyDates = (bDate: string, aDate: string) => {
    if (!bDate || !aDate || bDate === aDate) return;
    setBeforeDate(bDate);
    setAfterDate(aDate);
    if (onSelectDates) {
      onSelectDates(bDate, aDate);
    }
  };

  const hasPhotosToCompare = photoPairs.some((p) => p.beforeImage !== null || p.afterImage !== null);
  const visiblePairs =
    selectedPose === "ALL" ? photoPairs : photoPairs.filter((p) => p.pose === selectedPose);

  return (
    <div className="space-y-6">
      {/* Zoom Modal for Full Resolution Inspection */}
      {zoomImage && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 backdrop-blur-xs"
          onClick={() => setZoomImage(null)}
        >
          <div
            className="relative max-w-4xl max-h-[92vh] flex flex-col items-center justify-center p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between w-full pb-2 text-white text-xs font-semibold">
              <span>{zoomImage.title}</span>
              <button
                type="button"
                onClick={() => setZoomImage(null)}
                className="p-1 rounded-lg bg-white/20 hover:bg-white/30 text-white cursor-pointer"
                aria-label="Fechar ampliação"
              >
                ✕
              </button>
            </div>
            <img
              src={zoomImage.url}
              alt={zoomImage.title}
              className="max-h-[82vh] w-auto rounded-xl object-contain border border-white/20 shadow-2xl"
            />
          </div>
        </div>
      )}

      {/* Header with Date Selectors */}
      <div className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xs space-y-4 depth-surface">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-3">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--brand-foreground)] bg-[var(--brand-soft)] px-2 py-0.5 rounded-md border border-[var(--brand-soft-border)]">
              Comparador 360°
            </span>
            <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)] mt-1">
              Confronto Direto: {student.fullName}
            </h3>
            <p className="text-xs text-[var(--text-secondary)]">
              Comparação matemática e visual entre dois momentos da evolução.
            </p>
          </div>

          {onClose && (
            <Button type="button" variant="outline" size="sm" onClick={onClose} className="self-start sm:self-auto">
              Voltar à linha do tempo
            </Button>
          )}
        </div>

        {/* Date Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 items-end">
          <div className="space-y-1">
            <label htmlFor="before-date-select" className="text-xs font-semibold text-[var(--text-secondary)] block">
              1. Avaliação Anterior (Base):
            </label>
            <select
              id="before-date-select"
              value={beforeDate}
              onChange={(e) => handleApplyDates(e.target.value, afterDate)}
              className="w-full px-3 py-2 text-xs font-semibold bg-[var(--surface-subtle)] border border-[var(--border-default)] rounded-xl text-[var(--text-primary)] focus-visible:outline-2 focus-visible:outline-[var(--brand)]"
            >
              {allMilestones.map((m) => (
                <option key={`before-${m.date}`} value={m.date}>
                  {m.dateDisplay} {m.hasPhotos ? "(com fotos)" : "(medidas)"}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label htmlFor="after-date-select" className="text-xs font-semibold text-[var(--text-secondary)] block">
              2. Avaliação Recente (Depois):
            </label>
            <select
              id="after-date-select"
              value={afterDate}
              onChange={(e) => handleApplyDates(beforeDate, e.target.value)}
              className="w-full px-3 py-2 text-xs font-semibold bg-[var(--surface-subtle)] border border-[var(--border-default)] rounded-xl text-[var(--text-primary)] focus-visible:outline-2 focus-visible:outline-[var(--brand)]"
            >
              {allMilestones.map((m) => (
                <option key={`after-${m.date}`} value={m.date}>
                  {m.dateDisplay} {m.hasPhotos ? "(com fotos)" : "(medidas)"}
                </option>
              ))}
            </select>
          </div>

          <div className="p-2.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] flex items-center justify-between">
            <span className="font-medium">Intervalo Decorrido:</span>
            <span className="font-bold text-[var(--text-primary)] font-mono">
              {daysBetween !== null ? `${daysBetween} dias` : "—"}
            </span>
          </div>
        </div>
      </div>

      {/* Part 1: Physical Measurements Comparison Table (Rule 2: Neutral, math-only) */}
      <div className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xs space-y-4 depth-surface">
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2.5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
            Comparação de Medidas Físicas
          </h4>
          <span className="text-[11px] text-[var(--text-tertiary)] font-mono">
            {beforeMilestone?.dateDisplay || "—"} vs {afterMilestone?.dateDisplay || "—"}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {metricsComparison.map((m) => {
            const hasBefore = m.beforeValue !== null && m.beforeValue !== undefined;
            const hasAfter = m.afterValue !== null && m.afterValue !== undefined;
            const delta = m.delta;

            return (
              <div
                key={m.label}
                className="p-3.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--text-secondary)]">
                    {m.label}
                  </span>
                  {delta && (
                    <span
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold border ${
                        delta.direction === "UNCHANGED"
                          ? "bg-[var(--surface)] text-[var(--text-tertiary)] border-[var(--border-subtle)]"
                          : "bg-[var(--surface-sunken)] text-[var(--text-secondary)] border-[var(--border-default)]"
                      }`}
                    >
                      <span>{delta.direction === "INCREASED" ? "↑" : delta.direction === "DECREASED" ? "↓" : "•"}</span>
                      <span>{delta.diffFormatted}</span>
                      {delta.diffPercentageFormatted && (
                        <span className="text-[9px] opacity-75">({delta.diffPercentageFormatted})</span>
                      )}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-center pt-1 border-t border-[var(--border-subtle)]/60">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-[var(--text-tertiary)] block uppercase">
                      Antes ({beforeMilestone?.dateDisplay || "—"})
                    </span>
                    <span className="text-sm font-bold text-[var(--text-primary)] tabular-nums block">
                      {hasBefore ? `${m.beforeValue!.toLocaleString("pt-BR", { minimumFractionDigits: 1 })} ${m.unit}` : "—"}
                    </span>
                  </div>

                  <div className="space-y-0.5 border-l border-[var(--border-subtle)]/60">
                    <span className="text-[10px] text-[var(--text-tertiary)] block uppercase">
                      Depois ({afterMilestone?.dateDisplay || "—"})
                    </span>
                    <span className="text-sm font-bold text-[var(--text-primary)] tabular-nums block">
                      {hasAfter ? `${m.afterValue!.toLocaleString("pt-BR", { minimumFractionDigits: 1 })} ${m.unit}` : "—"}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Part 2: Photo Evaluation Comparison (Rule 3 & 4) */}
      <div className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xs space-y-4 depth-surface">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-3">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
              Comparação Fotográfica Padronizada
            </h4>
            <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">
              Fotos aprovadas lado a lado em containers uniformes 1:1.
            </p>
          </div>

          {/* Pose Selector Tabs */}
          <div className="inline-flex items-center bg-[var(--surface-sunken)] border border-[var(--border-default)] rounded-xl p-1 gap-1 flex-wrap">
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
        </div>

        {!hasPhotosToCompare ? (
          <div className="p-6 text-center rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-1">
            <p className="text-xs text-[var(--text-secondary)]">
              Pelo menos um dos marcos selecionados não possui fotos aprovadas para comparação visual.
            </p>
            <p className="text-[11px] text-[var(--text-tertiary)]">
              Selecione duas datas que possuam fotos de avaliação para visualizar o confronto fotográfico.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {visiblePairs.map((pair) => (
              <div
                key={pair.pose}
                className="p-4 sm:p-5 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-3"
              >
                <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[var(--brand)]" />
                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                      Pose: {pair.poseLabel}
                    </span>
                  </div>
                  <span className="text-[11px] text-[var(--text-tertiary)]">
                    Proporção uniforme (toque para zoom)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Before Image */}
                  <div className="space-y-1.5 bg-[var(--surface)] p-3 rounded-xl border border-[var(--border-default)]">
                    <div className="flex items-center justify-between">
                      <Badge variant="neutral" size="sm">
                        Antes
                      </Badge>
                      <span className="text-xs font-mono font-semibold text-[var(--text-secondary)]">
                        {beforeMilestone?.dateDisplay || "—"}
                      </span>
                    </div>

                    <div className="relative aspect-[3/4] w-full rounded-lg overflow-hidden bg-[var(--surface-sunken)] border border-[var(--border-subtle)] flex items-center justify-center">
                      {pair.beforeImage ? (
                        <button
                          type="button"
                          onClick={() =>
                            setZoomImage({
                              url: pair.beforeImage!.imageUrl,
                              title: `${pair.poseLabel} — Antes (${beforeMilestone?.dateDisplay})`,
                            })
                          }
                          className="w-full h-full cursor-zoom-in group/img focus-visible:outline-2 focus-visible:outline-[var(--brand)]"
                        >
                          <img
                            src={`${pair.beforeImage.imageUrl}?variant=thumb`}
                            alt={`Antes — ${pair.poseLabel}`}
                            loading="lazy"
                            className="w-full h-full object-cover object-center group-hover/img:scale-105 transition-transform duration-200"
                          />
                        </button>
                      ) : (
                        <span className="text-xs text-[var(--text-tertiary)] text-center p-4">
                          Sem foto nesta data
                        </span>
                      )}
                    </div>
                  </div>

                  {/* After Image */}
                  <div className="space-y-1.5 bg-[var(--surface)] p-3 rounded-xl border border-[var(--border-default)]">
                    <div className="flex items-center justify-between">
                      <Badge variant="brand" size="sm">
                        Depois
                      </Badge>
                      <span className="text-xs font-mono font-semibold text-[var(--text-secondary)]">
                        {afterMilestone?.dateDisplay || "—"}
                      </span>
                    </div>

                    <div className="relative aspect-[3/4] w-full rounded-lg overflow-hidden bg-[var(--surface-sunken)] border border-[var(--border-subtle)] flex items-center justify-center">
                      {pair.afterImage ? (
                        <button
                          type="button"
                          onClick={() =>
                            setZoomImage({
                              url: pair.afterImage!.imageUrl,
                              title: `${pair.poseLabel} — Depois (${afterMilestone?.dateDisplay})`,
                            })
                          }
                          className="w-full h-full cursor-zoom-in group/img focus-visible:outline-2 focus-visible:outline-[var(--brand)]"
                        >
                          <img
                            src={`${pair.afterImage.imageUrl}?variant=thumb`}
                            alt={`Depois — ${pair.poseLabel}`}
                            loading="lazy"
                            className="w-full h-full object-cover object-center group-hover/img:scale-105 transition-transform duration-200"
                          />
                        </button>
                      ) : (
                        <span className="text-xs text-[var(--text-tertiary)] text-center p-4">
                          Sem foto nesta data
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
