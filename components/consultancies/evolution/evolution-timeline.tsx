/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  EVALUATION_POSES,
  POSE_LABELS,
} from "@/types/photo-evaluations";
import type {
  EvolutionMilestoneDto,
  MetricDeltaDto,
} from "@/types/evolution";

interface EvolutionTimelineProps {
  milestones: EvolutionMilestoneDto[];
  onSelectForComparison?: (milestoneDate: string) => void;
  emptyMessage?: string;
}

function DeltaBadge({ delta }: { delta?: MetricDeltaDto | null }) {
  if (!delta) return null;

  const isNeutral = delta.direction === "UNCHANGED";

  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-mono font-semibold tabular-nums border ${
        isNeutral
          ? "bg-[var(--surface-subtle)] text-[var(--text-tertiary)] border-[var(--border-subtle)]"
          : "bg-[var(--surface-sunken)] text-[var(--text-secondary)] border-[var(--border-default)]"
      }`}
      title={`${delta.directionLabel}: ${delta.diffFormatted}${delta.diffPercentageFormatted ? ` (${delta.diffPercentageFormatted})` : ""}`}
    >
      <span>{delta.direction === "INCREASED" ? "↑" : delta.direction === "DECREASED" ? "↓" : "•"}</span>
      <span>{delta.diffFormatted}</span>
      {delta.diffPercentageFormatted && (
        <span className="text-[9px] opacity-75">({delta.diffPercentageFormatted})</span>
      )}
    </span>
  );
}

function formatVal(val: number | null, unit: string): string {
  if (val === null || val === undefined) return "—";
  return `${val.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 2 })} ${unit}`;
}

export function EvolutionTimeline({
  milestones,
  onSelectForComparison,
  emptyMessage = "Nenhum marco de evolução registrado até o momento.",
}: EvolutionTimelineProps) {
  const [zoomImage, setZoomImage] = useState<{ url: string; title: string } | null>(null);

  if (milestones.length === 0) {
    return (
      <EmptyState
        title="Linha do tempo vazia"
        description={emptyMessage}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Zoom Modal for Full-Resolution Inspection */}
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
              <span>{zoomImage.title} (Alta Resolução)</span>
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

      {/* Timeline Stream */}
      <div className="relative pl-4 sm:pl-6 border-l-2 border-[var(--border-default)] space-y-6">
        {milestones.map((m, idx) => {
          const isLatest = idx === 0;

          return (
            <div key={m.id} className="relative group">
              {/* Timeline Bullet */}
              <div
                className={`absolute -left-[25px] sm:-left-[33px] top-4 w-4 h-4 rounded-full border-2 transition-all ${
                  isLatest
                    ? "bg-[var(--brand)] border-[var(--surface)] ring-4 ring-[var(--brand-soft)]"
                    : "bg-[var(--surface)] border-[var(--border-strong)]"
                }`}
                aria-hidden="true"
              />

              {/* Milestone Card */}
              <div className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xs hover:border-[var(--border-strong)] transition-all space-y-4 depth-surface">
                {/* Milestone Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-3">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-sm sm:text-base font-bold text-[var(--text-primary)] font-mono">
                      {m.dateDisplay}
                    </span>

                    {isLatest && (
                      <Badge variant="brand" size="sm">
                        Marco Mais Recente
                      </Badge>
                    )}

                    {m.hasMeasurement && m.hasPhotos && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-[var(--brand-soft)] text-[var(--brand-foreground)] border border-[var(--brand-soft-border)]">
                        Avaliação Completa (Medidas + Fotos)
                      </span>
                    )}

                    {m.hasMeasurement && !m.hasPhotos && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-[var(--surface-subtle)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                        Medições Corporais
                      </span>
                    )}

                    {!m.hasMeasurement && m.hasPhotos && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-[var(--surface-subtle)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                        Fotos de Avaliação
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {onSelectForComparison && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onSelectForComparison(m.date)}
                        className="text-xs font-semibold"
                      >
                        Comparar
                      </Button>
                    )}
                  </div>
                </div>

                {/* Section 1: Physical Measurements (if present) */}
                {m.hasMeasurement && m.measurement && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] block">
                        Medições Físicas
                      </span>
                      {m.measurement.createdByName && (
                        <span className="text-[11px] text-[var(--text-tertiary)]">
                          Registrado por {m.measurement.createdByName}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                      {m.measurement.weightKg !== null && (
                        <div className="p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-1">
                          <span className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase block">
                            Peso
                          </span>
                          <div className="flex items-baseline justify-between gap-1 flex-wrap">
                            <span className="text-base font-bold text-[var(--text-primary)] tabular-nums">
                              {formatVal(m.measurement.weightKg, "kg")}
                            </span>
                            <DeltaBadge delta={m.weightDelta} />
                          </div>
                        </div>
                      )}

                      {m.measurement.waistCm !== null && (
                        <div className="p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-1">
                          <span className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase block">
                            Cintura
                          </span>
                          <div className="flex items-baseline justify-between gap-1 flex-wrap">
                            <span className="text-base font-bold text-[var(--text-primary)] tabular-nums">
                              {formatVal(m.measurement.waistCm, "cm")}
                            </span>
                            <DeltaBadge delta={m.waistDelta} />
                          </div>
                        </div>
                      )}

                      {m.measurement.abdomenCm !== null && (
                        <div className="p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-1">
                          <span className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase block">
                            Abdômen
                          </span>
                          <div className="flex items-baseline justify-between gap-1 flex-wrap">
                            <span className="text-base font-bold text-[var(--text-primary)] tabular-nums">
                              {formatVal(m.measurement.abdomenCm, "cm")}
                            </span>
                            <DeltaBadge delta={m.abdomenDelta} />
                          </div>
                        </div>
                      )}

                      {m.measurement.hipCm !== null && (
                        <div className="p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-1">
                          <span className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase block">
                            Quadril
                          </span>
                          <div className="flex items-baseline justify-between gap-1 flex-wrap">
                            <span className="text-base font-bold text-[var(--text-primary)] tabular-nums">
                              {formatVal(m.measurement.hipCm, "cm")}
                            </span>
                            <DeltaBadge delta={m.hipDelta} />
                          </div>
                        </div>
                      )}

                      {m.measurement.armCm !== null && (
                        <div className="p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-1">
                          <span className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase block">
                            Braço
                          </span>
                          <div className="flex items-baseline justify-between gap-1 flex-wrap">
                            <span className="text-base font-bold text-[var(--text-primary)] tabular-nums">
                              {formatVal(m.measurement.armCm, "cm")}
                            </span>
                            <DeltaBadge delta={m.armDelta} />
                          </div>
                        </div>
                      )}

                      {m.measurement.thighCm !== null && (
                        <div className="p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-1">
                          <span className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase block">
                            Coxa
                          </span>
                          <div className="flex items-baseline justify-between gap-1 flex-wrap">
                            <span className="text-base font-bold text-[var(--text-primary)] tabular-nums">
                              {formatVal(m.measurement.thighCm, "cm")}
                            </span>
                            <DeltaBadge delta={m.thighDelta} />
                          </div>
                        </div>
                      )}
                    </div>

                    {m.measurement.note && (
                      <p className="text-xs text-[var(--text-secondary)] italic pt-1">
                        &ldquo;{m.measurement.note}&rdquo;
                      </p>
                    )}
                  </div>
                )}

                {/* Section 2: Photos Gallery (if present) */}
                {m.hasPhotos && m.photos && (
                  <div className="space-y-2 pt-2 border-t border-[var(--border-subtle)]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
                          Fotos de Avaliação
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--surface-subtle)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                          {m.photos.statusLabel}
                        </span>
                      </div>
                      <span className="text-[11px] text-[var(--text-tertiary)]">
                        {m.photos.completedPosesCount} de 4 poses
                      </span>
                    </div>

                    {/* 4 Poses Grid with Lightweight Private Thumbnails */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                      {EVALUATION_POSES.map((pose) => {
                        const img = m.photos?.images[pose];
                        const label = POSE_LABELS[pose];

                        return (
                          <div
                            key={pose}
                            className="space-y-1.5 bg-[var(--surface-subtle)] p-2 rounded-xl border border-[var(--border-subtle)]"
                          >
                            <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase block truncate">
                              {label}
                            </span>

                            <div className="relative aspect-[3/4] w-full rounded-lg overflow-hidden bg-[var(--surface-sunken)] border border-[var(--border-subtle)] flex items-center justify-center">
                              {img ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setZoomImage({
                                      url: img.imageUrl, // Full resolution on zoom
                                      title: `${label} — ${m.dateDisplay}`,
                                    })
                                  }
                                  className="w-full h-full cursor-zoom-in group/img focus-visible:outline-2 focus-visible:outline-[var(--brand)]"
                                  aria-label={`Ampliar foto ${label}`}
                                >
                                  {/* Rule 5: Thumbnail query variant=thumb loads compact server-side resized webp */}
                                  <img
                                    src={`${img.imageUrl}?variant=thumb`}
                                    alt={`Foto de ${label}`}
                                    loading="lazy"
                                    className="w-full h-full object-cover object-center group-hover/img:scale-105 transition-transform duration-200"
                                  />
                                </button>
                              ) : (
                                <span className="text-[10px] text-[var(--text-tertiary)] text-center p-2">
                                  Não enviada
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {m.photos.reviewerNotes && (
                      <div className="p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] block">
                          Parecer Profissional:
                        </span>
                        <p>{m.photos.reviewerNotes}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
