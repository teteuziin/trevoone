/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { StudentProgressForm } from "@/components/consultancies/student-progress-form";
import {
  EVALUATION_POSES,
  POSE_LABELS,
  type PhotoEvaluationPose,
} from "@/types/photo-evaluations";
import {
  type EvolutionHubDataDto,
  type EvolutionMilestoneDto,
  type EvolutionComparisonDataDto,
  formatMetricNumber,
} from "@/types/evolution";

export interface MobileEvolutionCockpitProps {
  consultancySlug: string;
  hubData: EvolutionHubDataDto;
  initialComparisonData: EvolutionComparisonDataDto | null;
  isStudent?: boolean;
  isPersonal?: boolean;
  isNutritionist?: boolean;
  isAdmin?: boolean;
  studentPublicId?: string;
  onOpenPhotosTab?: () => void;
}

type PeriodOption = "30d" | "90d" | "180d" | "all";
type ChartMetric = "weight" | "waist" | "abdomen";

export function MobileEvolutionCockpit({
  consultancySlug,
  hubData,
  initialComparisonData,
  isStudent = false,
  isPersonal = false,
  studentPublicId,
  onOpenPhotosTab,
}: MobileEvolutionCockpitProps) {
  const { milestones, summary, student, activePendingPhotoRequest } = hubData;

  // Modals & View States
  const [isNewProgressModalOpen, setIsNewProgressModalOpen] = useState(false);
  const [isComparing, setIsComparing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodOption>("all");
  const [activeChartMetric, setActiveChartMetric] = useState<ChartMetric>("weight");
  const [activePointIndex, setActivePointIndex] = useState<number | null>(null);
  const [zoomImage, setZoomImage] = useState<{ url: string; title: string } | null>(null);
  const [expandedMilestoneId, setExpandedMilestoneId] = useState<string | null>(null);

  // Comparison State
  const [beforeDate, setBeforeDate] = useState<string>(() => {
    if (initialComparisonData?.beforeMilestone?.date) {
      return initialComparisonData.beforeMilestone.date;
    }
    return milestones.length > 1 ? milestones[milestones.length - 1].date : "";
  });

  const [afterDate, setAfterDate] = useState<string>(() => {
    if (initialComparisonData?.afterMilestone?.date) {
      return initialComparisonData.afterMilestone.date;
    }
    return milestones.length > 0 ? milestones[0].date : "";
  });

  const [selectedPose, setSelectedPose] = useState<PhotoEvaluationPose | "ALL">("ALL");

  const latestMilestone: EvolutionMilestoneDto | null = milestones.length > 0 ? milestones[0] : null;
  const previousMilestone: EvolutionMilestoneDto | null = milestones.length > 1 ? milestones[1] : null;

  // Filter milestones by period
  const filteredMilestones = useMemo(() => {
    if (selectedPeriod === "all" || milestones.length === 0) {
      return milestones;
    }
    const now = new Date();
    const days = selectedPeriod === "30d" ? 30 : selectedPeriod === "90d" ? 90 : 180;
    const cutoffTime = now.getTime() - days * 24 * 60 * 60 * 1000;

    return milestones.filter((m) => {
      const t = new Date(m.date + "T12:00:00").getTime();
      return t >= cutoffTime;
    });
  }, [milestones, selectedPeriod]);

  // Points for the active single-metric chart
  const activeChartPoints = useMemo(() => {
    const sortedAsc = [...filteredMilestones].reverse();
    const pts: Array<{
      date: string;
      dateDisplay: string;
      value: number;
      formattedValue: string;
    }> = [];

    for (const m of sortedAsc) {
      if (!m.measurement) continue;
      let val: number | null = null;
      let unit = "kg";

      if (activeChartMetric === "weight") {
        val = m.measurement.weightKg;
        unit = "kg";
      } else if (activeChartMetric === "waist") {
        val = m.measurement.waistCm;
        unit = "cm";
      } else if (activeChartMetric === "abdomen") {
        val = m.measurement.abdomenCm;
        unit = "cm";
      }

      if (val !== null && val !== undefined) {
        pts.push({
          date: m.date,
          dateDisplay: m.dateDisplay,
          value: val,
          formattedValue: `${val.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ${unit}`,
        });
      }
    }

    return pts;
  }, [filteredMilestones, activeChartMetric]);

  // Resolve selected milestone objects for comparison
  const compBeforeMilestone = useMemo(
    () => milestones.find((m) => m.date === beforeDate) || null,
    [milestones, beforeDate]
  );
  const compAfterMilestone = useMemo(
    () => milestones.find((m) => m.date === afterDate) || null,
    [milestones, afterDate]
  );

  // Computed days between comparison dates
  const daysBetweenComp = useMemo(() => {
    if (!compBeforeMilestone || !compAfterMilestone) return null;
    const t1 = new Date(compBeforeMilestone.date + "T12:00:00").getTime();
    const t2 = new Date(compAfterMilestone.date + "T12:00:00").getTime();
    return Math.abs(Math.round((t2 - t1) / (24 * 60 * 60 * 1000)));
  }, [compBeforeMilestone, compAfterMilestone]);

  // Measurements comparison list
  const comparedMetrics = useMemo(() => {
    if (!compBeforeMilestone || !compAfterMilestone) return [];

    const mBefore = compBeforeMilestone.measurement;
    const mAfter = compAfterMilestone.measurement;

    const list = [
      { label: "Peso", unit: "kg", before: mBefore?.weightKg ?? null, after: mAfter?.weightKg ?? null },
      { label: "Cintura", unit: "cm", before: mBefore?.waistCm ?? null, after: mAfter?.waistCm ?? null },
      { label: "Abdômen", unit: "cm", before: mBefore?.abdomenCm ?? null, after: mAfter?.abdomenCm ?? null },
      { label: "Quadril", unit: "cm", before: mBefore?.hipCm ?? null, after: mAfter?.hipCm ?? null },
      { label: "Braço", unit: "cm", before: mBefore?.armCm ?? null, after: mAfter?.armCm ?? null },
      { label: "Coxa", unit: "cm", before: mBefore?.thighCm ?? null, after: mAfter?.thighCm ?? null },
    ];

    // Rule 21: Omit metrics where neither before nor after has data
    return list.filter((item) => item.before !== null || item.after !== null);
  }, [compBeforeMilestone, compAfterMilestone]);

  // Helper to format neutral delta
  const renderDeltaBadge = (beforeVal: number | null, afterVal: number | null, unit: string) => {
    if (beforeVal === null || afterVal === null) return null;
    const diff = Math.round((afterVal - beforeVal) * 100) / 100;
    const displayUnit = unit === "%" ? "p.p." : unit;
    if (diff === 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-[var(--surface-subtle)] text-[var(--text-tertiary)] border border-[var(--border-subtle)]">
          • 0,0 {displayUnit}
        </span>
      );
    }
    const sign = diff > 0 ? "+" : "";
    const arrow = diff > 0 ? "↑" : "↓";
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-[var(--surface-subtle)] text-[var(--text-primary)] border border-[var(--border-default)]">
        <span>{arrow}</span>
        <span>{sign}{diff.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} {displayUnit}</span>
      </span>
    );
  };

  const handleStartComparisonWith = (milestoneDate: string) => {
    if (latestMilestone && latestMilestone.date !== milestoneDate) {
      setBeforeDate(milestoneDate);
      setAfterDate(latestMilestone.date);
    } else if (previousMilestone) {
      setBeforeDate(previousMilestone.date);
      setAfterDate(milestoneDate);
    }
    setIsComparing(true);
  };

  return (
    <div className="space-y-4 pb-[calc(2.5rem+env(safe-area-inset-bottom,0px))]">
      {/* Zoom Modal for Photos */}
      {zoomImage && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in"
          onClick={() => setZoomImage(null)}
        >
          <div
            className="relative max-w-lg w-full flex flex-col items-center justify-center p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between w-full pb-2.5 text-white text-xs font-semibold">
              <span className="truncate pr-2">{zoomImage.title}</span>
              <button
                type="button"
                onClick={() => setZoomImage(null)}
                className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                aria-label="Fechar ampliação"
              >
                ✕
              </button>
            </div>
            <img
              src={zoomImage.url}
              alt={zoomImage.title}
              className="max-h-[80vh] w-auto rounded-2xl object-contain border border-white/20 shadow-2xl"
            />
          </div>
        </div>
      )}

      {/* Controlled Progress Registration Form (Slide-up Bottom Sheet on mobile) */}
      <StudentProgressForm
        consultancySlug={consultancySlug}
        studentPublicId={studentPublicId}
        isOpenControlled={isNewProgressModalOpen}
        onCloseControlled={() => setIsNewProgressModalOpen(false)}
        hideTrigger={true}
        onSuccess={() => {
          setIsNewProgressModalOpen(false);
        }}
      />

      {/* =========================================================================
          1. HEADER CONTEXT & TOP HERO CARD
          Answers: "Como estou agora? O que mudou? Qual foi minha última avaliação?"
          ========================================================================= */}
      <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-2xl p-4 space-y-3.5 shadow-2xs depth-surface">
        <div className="flex items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-2.5">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--brand)]" />
            <h1 className="text-sm font-bold text-[var(--text-primary)]">
              {isStudent ? "Minha Evolução" : `Evolução de ${student.fullName}`}
            </h1>
          </div>
          {latestMilestone ? (
            <Badge variant="brand" size="sm">
              Última: {latestMilestone.dateDisplay}
            </Badge>
          ) : (
            <Badge variant="neutral" size="sm">
              Sem avaliações
            </Badge>
          )}
        </div>

        {/* STATE A: ZERO EVALUATIONS */}
        {milestones.length === 0 && (
          <div className="py-6 px-3 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-[var(--brand)] mx-auto flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="space-y-1">
              <h2 className="text-sm font-bold text-[var(--text-primary)]">
                Nenhuma avaliação registrada
              </h2>
              <p className="text-xs text-[var(--text-secondary)] max-w-xs mx-auto">
                {isStudent
                  ? "Sua evolução aparecerá aqui quando sua primeira avaliação física for registrada."
                  : "Registre a primeira avaliação para acompanhar a evolução física do aluno."}
              </p>
            </div>
            {(isPersonal || isStudent) && (
              <button
                type="button"
                onClick={() => setIsNewProgressModalOpen(true)}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-xs text-[var(--text-inverse)] bg-[var(--brand)] hover:bg-[var(--brand-hover)] min-h-[48px] shadow-xs cursor-pointer"
              >
                + Registrar primeira avaliação
              </button>
            )}
          </div>
        )}

        {/* STATE B: SINGLE EVALUATION (Rule 42: No artificial "-0" diff) */}
        {milestones.length === 1 && latestMilestone && (
          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-1">
              <div className="text-[10px] font-bold text-[var(--brand)] uppercase tracking-wider">
                Primeira Avaliação Registrada
              </div>
              <p className="text-xs text-[var(--text-secondary)]">
                Valores de referência registrados em <strong>{latestMilestone.dateDisplay}</strong>. Registre a próxima avaliação para habilitar o comparador e gráficos de tendência.
              </p>
            </div>

            {/* Current Measurements Grid */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-0.5">
                <span className="text-[10px] uppercase font-semibold text-[var(--text-tertiary)] block">
                  Peso
                </span>
                <span className="text-base font-bold text-[var(--text-primary)] tabular-nums block">
                  {formatMetricNumber(latestMilestone.measurement?.weightKg ?? null, "kg")}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-0.5">
                <span className="text-[10px] uppercase font-semibold text-[var(--text-tertiary)] block">
                  Cintura
                </span>
                <span className="text-base font-bold text-[var(--text-primary)] tabular-nums block">
                  {formatMetricNumber(latestMilestone.measurement?.waistCm ?? null, "cm")}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-0.5">
                <span className="text-[10px] uppercase font-semibold text-[var(--text-tertiary)] block">
                  Abdômen
                </span>
                <span className="text-base font-bold text-[var(--text-primary)] tabular-nums block">
                  {formatMetricNumber(latestMilestone.measurement?.abdomenCm ?? null, "cm")}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-0.5">
                <span className="text-[10px] uppercase font-semibold text-[var(--text-tertiary)] block">
                  Quadril
                </span>
                <span className="text-base font-bold text-[var(--text-primary)] tabular-nums block">
                  {formatMetricNumber(latestMilestone.measurement?.hipCm ?? null, "cm")}
                </span>
              </div>
            </div>

            {/* CTA */}
            {(isPersonal || isStudent) && (
              <button
                type="button"
                onClick={() => setIsNewProgressModalOpen(true)}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-xs text-[var(--text-inverse)] bg-[var(--brand)] hover:bg-[var(--brand-hover)] min-h-[48px] shadow-xs cursor-pointer"
              >
                + Nova avaliação
              </button>
            )}
          </div>
        )}

        {/* STATE C: TWO OR MORE EVALUATIONS (Full evolution cockpit) */}
        {milestones.length >= 2 && latestMilestone && (
          <div className="space-y-3">
            <div className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-tertiary)]">
              Principais Mudanças Recentes
            </div>

            {/* 3-4 Top Metrics with Neutral Variation */}
            <div className="grid grid-cols-2 gap-2.5">
              {/* Peso */}
              <div className="p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-1">
                <span className="text-[10px] uppercase font-semibold text-[var(--text-tertiary)] block">
                  Peso
                </span>
                <div className="flex items-baseline justify-between gap-1 flex-wrap">
                  <span className="text-base font-extrabold text-[var(--text-primary)] tabular-nums">
                    {latestMilestone.measurement?.weightKg !== null
                      ? `${latestMilestone.measurement?.weightKg} kg`
                      : "—"}
                  </span>
                  {latestMilestone.weightDelta && (
                    <span className="text-[11px] font-semibold text-[var(--text-secondary)] font-mono">
                      {latestMilestone.weightDelta.direction === "INCREASED" ? "↑" : latestMilestone.weightDelta.direction === "DECREASED" ? "↓" : "•"}{" "}
                      {latestMilestone.weightDelta.diffFormatted}
                    </span>
                  )}
                </div>
                {previousMilestone && (
                  <span className="text-[9px] text-[var(--text-tertiary)] block">
                    desde {previousMilestone.dateDisplay}
                  </span>
                )}
              </div>

              {/* Cintura */}
              <div className="p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-1">
                <span className="text-[10px] uppercase font-semibold text-[var(--text-tertiary)] block">
                  Cintura
                </span>
                <div className="flex items-baseline justify-between gap-1 flex-wrap">
                  <span className="text-base font-extrabold text-[var(--text-primary)] tabular-nums">
                    {latestMilestone.measurement?.waistCm !== null
                      ? `${latestMilestone.measurement?.waistCm} cm`
                      : "—"}
                  </span>
                  {latestMilestone.waistDelta && (
                    <span className="text-[11px] font-semibold text-[var(--text-secondary)] font-mono">
                      {latestMilestone.waistDelta.direction === "INCREASED" ? "↑" : latestMilestone.waistDelta.direction === "DECREASED" ? "↓" : "•"}{" "}
                      {latestMilestone.waistDelta.diffFormatted}
                    </span>
                  )}
                </div>
                {previousMilestone && (
                  <span className="text-[9px] text-[var(--text-tertiary)] block">
                    desde {previousMilestone.dateDisplay}
                  </span>
                )}
              </div>

              {/* Abdômen */}
              <div className="p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-1">
                <span className="text-[10px] uppercase font-semibold text-[var(--text-tertiary)] block">
                  Abdômen
                </span>
                <div className="flex items-baseline justify-between gap-1 flex-wrap">
                  <span className="text-base font-extrabold text-[var(--text-primary)] tabular-nums">
                    {latestMilestone.measurement?.abdomenCm !== null
                      ? `${latestMilestone.measurement?.abdomenCm} cm`
                      : "—"}
                  </span>
                  {latestMilestone.abdomenDelta && (
                    <span className="text-[11px] font-semibold text-[var(--text-secondary)] font-mono">
                      {latestMilestone.abdomenDelta.direction === "INCREASED" ? "↑" : latestMilestone.abdomenDelta.direction === "DECREASED" ? "↓" : "•"}{" "}
                      {latestMilestone.abdomenDelta.diffFormatted}
                    </span>
                  )}
                </div>
                {previousMilestone && (
                  <span className="text-[9px] text-[var(--text-tertiary)] block">
                    desde {previousMilestone.dateDisplay}
                  </span>
                )}
              </div>

              {/* Total Weight Delta from Start */}
              <div className="p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-1">
                <span className="text-[10px] uppercase font-semibold text-[var(--text-tertiary)] block">
                  Mudança Total
                </span>
                <div className="flex items-baseline justify-between gap-1 flex-wrap">
                  <span className="text-base font-extrabold text-[var(--text-primary)] tabular-nums">
                    {summary.totalWeightDelta ? summary.totalWeightDelta.diffFormatted : "—"}
                  </span>
                  {summary.totalWeightDelta?.diffPercentageFormatted && (
                    <span className="text-[10px] font-mono text-[var(--text-secondary)]">
                      ({summary.totalWeightDelta.diffPercentageFormatted})
                    </span>
                  )}
                </div>
                {summary.firstRecordedDate && (
                  <span className="text-[9px] text-[var(--text-tertiary)] block">
                    desde {summary.firstRecordedDate}
                  </span>
                )}
              </div>
            </div>

            {/* Primary Action Buttons */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsComparing(!isComparing)}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl font-bold text-xs text-[var(--text-primary)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] border border-[var(--border-default)] min-h-[48px] shadow-2xs transition-colors cursor-pointer"
              >
                <span>⇄ {isComparing ? "Fechar comparação" : "Comparar avaliações"}</span>
              </button>

              {(isPersonal || isStudent) && (
                <button
                  type="button"
                  onClick={() => setIsNewProgressModalOpen(true)}
                  className="inline-flex items-center justify-center gap-1 px-4 py-3 rounded-xl font-bold text-xs text-[var(--text-inverse)] bg-[var(--brand)] hover:bg-[var(--brand-hover)] min-h-[48px] shadow-xs transition-colors cursor-pointer shrink-0"
                >
                  <span>+ Nova avaliação</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          2. PENDING PHOTO BANNER (if active request exists)
          ========================================================================= */}
      {activePendingPhotoRequest && (
        <div className="p-3.5 rounded-2xl bg-[var(--brand-soft)] border border-[var(--brand-soft-border)] space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-[var(--brand-foreground)]">
              Fotos de Avaliação: {activePendingPhotoRequest.statusLabel}
            </span>
            <Badge variant="brand" size="sm">
              {activePendingPhotoRequest.completedPosesCount} de 4 fotos
            </Badge>
          </div>
          <p className="text-xs text-[var(--text-primary)]">
            {isStudent
              ? "Envie as 4 fotos corporais padronizadas para acompanhar sua evolução visual."
              : `${student.fullName} possui uma solicitação de fotos em andamento.`}
          </p>
          {onOpenPhotosTab && (
            <button
              type="button"
              onClick={onOpenPhotosTab}
              className="w-full py-2 px-3 rounded-xl font-semibold text-xs text-[var(--text-inverse)] bg-[var(--brand)] min-h-[44px] cursor-pointer"
            >
              {isStudent ? "Enviar fotos agora" : "Revisar fotos"}
            </button>
          )}
        </div>
      )}

      {/* =========================================================================
          3. COMPARISON VIEW (When user clicks "Comparar avaliações")
          ========================================================================= */}
      {isComparing && milestones.length >= 2 && (
        <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-2xl p-4 space-y-4 shadow-xs animate-in fade-in">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2.5">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--brand)]">
                Comparador Direto
              </span>
              <h2 className="text-sm font-bold text-[var(--text-primary)]">
                Confronto de Medidas &amp; Fotos
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setIsComparing(false)}
              className="text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1.5 rounded-lg min-h-[44px] flex items-center cursor-pointer"
            >
              Fechar ✕
            </button>
          </div>

          {/* Date Pickers */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="space-y-1">
              <label htmlFor="comp-before" className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase block">
                1. Antes (Base)
              </label>
              <select
                id="comp-before"
                value={beforeDate}
                onChange={(e) => setBeforeDate(e.target.value)}
                className="w-full px-2.5 py-2 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)] text-xs text-[var(--text-primary)] font-semibold min-h-[44px]"
              >
                {milestones.map((m) => (
                  <option key={`m-b-${m.date}`} value={m.date}>
                    {m.dateDisplay}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="comp-after" className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase block">
                2. Depois (Atual)
              </label>
              <select
                id="comp-after"
                value={afterDate}
                onChange={(e) => setAfterDate(e.target.value)}
                className="w-full px-2.5 py-2 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)] text-xs text-[var(--text-primary)] font-semibold min-h-[44px]"
              >
                {milestones.map((m) => (
                  <option key={`m-a-${m.date}`} value={m.date}>
                    {m.dateDisplay}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {daysBetweenComp !== null && (
            <div className="text-[11px] text-center text-[var(--text-tertiary)] bg-[var(--surface-subtle)] py-1.5 rounded-lg font-mono">
              Intervalo entre avaliações: <strong>{daysBetweenComp} dias</strong>
            </div>
          )}

          {/* Metrics Comparison Table */}
          <div className="space-y-2 pt-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] block">
              Diferença de Medidas
            </span>
            {comparedMetrics.length === 0 ? (
              <p className="text-xs text-[var(--text-tertiary)] text-center py-4">
                Nenhuma medida corporal registrada nas duas datas selecionadas.
              </p>
            ) : (
              <div className="space-y-2">
                {comparedMetrics.map((item) => (
                  <div
                    key={item.label}
                    className="p-2.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] flex items-center justify-between gap-2"
                  >
                    <div>
                      <span className="text-xs font-bold text-[var(--text-primary)] block">
                        {item.label}
                      </span>
                      <span className="text-[11px] text-[var(--text-tertiary)]">
                        Antes: {item.before !== null ? `${item.before} ${item.unit}` : "—"} → Agora: {item.after !== null ? `${item.after} ${item.unit}` : "—"}
                      </span>
                    </div>
                    <div>
                      {renderDeltaBadge(item.before, item.after, item.unit)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Photo Comparison (Same Pose Strictly Guaranteed) */}
          {(compBeforeMilestone?.hasPhotos || compAfterMilestone?.hasPhotos) && (
            <div className="space-y-3 pt-2 border-t border-[var(--border-subtle)]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
                  Fotos Padronizadas
                </span>
                <span className="text-[10px] text-[var(--text-tertiary)]">
                  Mesma pose
                </span>
              </div>

              {/* Pose Filter Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                <button
                  type="button"
                  onClick={() => setSelectedPose("ALL")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap min-h-[36px] transition-colors ${
                    selectedPose === "ALL"
                      ? "bg-[var(--brand)] text-[var(--text-inverse)]"
                      : "bg-[var(--surface-subtle)] text-[var(--text-secondary)]"
                  }`}
                >
                  Todas
                </button>
                {EVALUATION_POSES.map((pose) => (
                  <button
                    key={pose}
                    type="button"
                    onClick={() => setSelectedPose(pose)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap min-h-[36px] transition-colors ${
                      selectedPose === pose
                        ? "bg-[var(--brand)] text-[var(--text-inverse)]"
                        : "bg-[var(--surface-subtle)] text-[var(--text-secondary)]"
                    }`}
                  >
                    {POSE_LABELS[pose]}
                  </button>
                ))}
              </div>

              {/* Pairs Display */}
              <div className="space-y-3">
                {EVALUATION_POSES.filter((p) => selectedPose === "ALL" || selectedPose === p).map((pose) => {
                  const bImg = compBeforeMilestone?.photos?.images[pose];
                  const aImg = compAfterMilestone?.photos?.images[pose];

                  if (!bImg && !aImg) return null;

                  return (
                    <div
                      key={pose}
                      className="p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-2"
                    >
                      <span className="text-xs font-bold text-[var(--text-primary)] block">
                        Pose: {POSE_LABELS[pose]}
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        {/* Before Photo */}
                        <div className="space-y-1">
                          <span className="text-[10px] font-semibold text-[var(--text-tertiary)] block text-center truncate">
                            Antes ({compBeforeMilestone?.dateDisplay || "—"})
                          </span>
                          <div className="aspect-3/4 rounded-lg bg-[var(--surface-sunken)] border border-[var(--border-default)] overflow-hidden relative flex items-center justify-center">
                            {bImg ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setZoomImage({
                                    url: bImg.imageUrl,
                                    title: `${POSE_LABELS[pose]} — Antes (${compBeforeMilestone?.dateDisplay})`,
                                  })
                                }
                                className="w-full h-full cursor-zoom-in"
                              >
                                <img
                                  src={bImg.imageUrl}
                                  alt={`Antes — ${POSE_LABELS[pose]}`}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                />
                              </button>
                            ) : (
                              <span className="text-[10px] text-[var(--text-tertiary)] p-2 text-center">
                                Sem foto
                              </span>
                            )}
                          </div>
                        </div>

                        {/* After Photo */}
                        <div className="space-y-1">
                          <span className="text-[10px] font-semibold text-[var(--text-tertiary)] block text-center truncate">
                            Depois ({compAfterMilestone?.dateDisplay || "—"})
                          </span>
                          <div className="aspect-3/4 rounded-lg bg-[var(--surface-sunken)] border border-[var(--border-default)] overflow-hidden relative flex items-center justify-center">
                            {aImg ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setZoomImage({
                                    url: aImg.imageUrl,
                                    title: `${POSE_LABELS[pose]} — Depois (${compAfterMilestone?.dateDisplay})`,
                                  })
                                }
                                className="w-full h-full cursor-zoom-in"
                              >
                                <img
                                  src={aImg.imageUrl}
                                  alt={`Depois — ${POSE_LABELS[pose]}`}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                />
                              </button>
                            ) : (
                              <span className="text-[10px] text-[var(--text-tertiary)] p-2 text-center">
                                Sem foto
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          4. PERIOD SELECTOR & SINGLE-METRIC FOCUSED CHART (Rule 9 & 10)
          "Um gráfico por contexto. Seletor de métrica. Sem overflow horizontal."
          ========================================================================= */}
      {milestones.length >= 2 && (
        <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-2xl p-4 space-y-3.5 shadow-2xs depth-surface">
          {/* Header & Period Filter Chips */}
          <div className="flex items-center justify-between gap-2 flex-wrap border-b border-[var(--border-subtle)] pb-2.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
              Gráfico de Tendência
            </span>

            {/* Period Filter (Rule 8) */}
            <div className="flex items-center gap-1">
              {(
                [
                  { id: "30d", label: "30 dias" },
                  { id: "90d", label: "3 meses" },
                  { id: "180d", label: "6 meses" },
                  { id: "all", label: "Tudo" },
                ] as const
              ).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedPeriod(p.id)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer ${
                    selectedPeriod === p.id
                      ? "bg-[var(--brand)] text-[var(--text-inverse)]"
                      : "bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Metric Selector (1 graph per context - Rule 10) */}
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-[var(--surface-subtle)] rounded-xl">
            <button
              type="button"
              onClick={() => {
                setActiveChartMetric("weight");
                setActivePointIndex(null);
              }}
              className={`py-1.5 px-2 rounded-lg text-xs font-semibold text-center transition-all min-h-[44px] flex items-center justify-center cursor-pointer ${
                activeChartMetric === "weight"
                  ? "bg-[var(--surface)] text-[var(--text-primary)] shadow-2xs font-bold"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              ⚖️ Peso
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveChartMetric("waist");
                setActivePointIndex(null);
              }}
              className={`py-1.5 px-2 rounded-lg text-xs font-semibold text-center transition-all min-h-[44px] flex items-center justify-center cursor-pointer ${
                activeChartMetric === "waist"
                  ? "bg-[var(--surface)] text-[var(--text-primary)] shadow-2xs font-bold"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              📏 Cintura
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveChartMetric("abdomen");
                setActivePointIndex(null);
              }}
              className={`py-1.5 px-2 rounded-lg text-xs font-semibold text-center transition-all min-h-[44px] flex items-center justify-center cursor-pointer ${
                activeChartMetric === "abdomen"
                  ? "bg-[var(--surface)] text-[var(--text-primary)] shadow-2xs font-bold"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              📐 Abdômen
            </button>
          </div>

          {/* Active SVG Chart */}
          {activeChartPoints.length === 0 ? (
            <p className="text-xs text-[var(--text-tertiary)] text-center py-6">
              Nenhuma medição registrada para esta métrica no período selecionado.
            </p>
          ) : activeChartPoints.length === 1 ? (
            <div className="p-3 text-center rounded-xl bg-[var(--surface-subtle)] space-y-1">
              <span className="text-base font-bold text-[var(--text-primary)]">
                {activeChartPoints[0].formattedValue}
              </span>
              <span className="text-[10px] text-[var(--text-tertiary)] block">
                Único registro no período ({activeChartPoints[0].dateDisplay})
              </span>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Touch Value Display */}
              <div className="flex items-center justify-between text-xs px-1">
                <span className="text-[var(--text-tertiary)]">
                  {activePointIndex !== null
                    ? `Data: ${activeChartPoints[activePointIndex].dateDisplay}`
                    : "Toque em um ponto para detalhes"}
                </span>
                <span className="font-bold text-[var(--text-primary)] tabular-nums">
                  {activePointIndex !== null
                    ? activeChartPoints[activePointIndex].formattedValue
                    : activeChartPoints[activeChartPoints.length - 1].formattedValue}
                </span>
              </div>

              {/* Responsive SVG Chart */}
              <div className="w-full aspect-[2/1] relative overflow-hidden">
                {(() => {
                  const width = 360;
                  const height = 180;
                  const padX = 24;
                  const padY = 24;
                  const innerW = width - padX * 2;
                  const innerH = height - padY * 2;

                  const values = activeChartPoints.map((p) => p.value);
                  const min = Math.min(...values);
                  const max = Math.max(...values);
                  const range = max - min || 1;

                  const coords = activeChartPoints.map((p, idx) => {
                    const x = padX + (idx / (activeChartPoints.length - 1)) * innerW;
                    const y = padY + innerH - ((p.value - min) / range) * innerH;
                    return { x, y, p };
                  });

                  const lineD = coords.reduce(
                    (acc, c, idx) => (idx === 0 ? `M ${c.x} ${c.y}` : `${acc} L ${c.x} ${c.y}`),
                    ""
                  );
                  const areaD = `${lineD} L ${coords[coords.length - 1].x} ${padY + innerH} L ${coords[0].x} ${padY + innerH} Z`;

                  return (
                    <svg
                      viewBox={`0 0 ${width} ${height}`}
                      className="w-full h-full select-none"
                    >
                      <defs>
                        <linearGradient id="mobileChartGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="var(--brand)" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>

                      {/* Guide lines */}
                      <line
                        x1={padX}
                        y1={padY}
                        x2={width - padX}
                        y2={padY}
                        stroke="var(--border-subtle)"
                        strokeDasharray="3 3"
                      />
                      <line
                        x1={padX}
                        y1={padY + innerH}
                        x2={width - padX}
                        y2={padY + innerH}
                        stroke="var(--border-subtle)"
                      />

                      {/* Area & Line */}
                      <path d={areaD} fill="url(#mobileChartGrad)" />
                      <path
                        d={lineD}
                        fill="none"
                        stroke="var(--brand)"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />

                      {/* Interactive Point Targets */}
                      {coords.map((c, idx) => {
                        const isSelected = activePointIndex === idx;
                        return (
                          <g
                            key={c.p.date}
                            onClick={() => setActivePointIndex(idx)}
                            className="cursor-pointer"
                          >
                            {/* Larger transparent touch hit target (min 32px) */}
                            <circle cx={c.x} cy={c.y} r={16} fill="transparent" />
                            {/* Visible point */}
                            <circle
                              cx={c.x}
                              cy={c.y}
                              r={isSelected ? 6 : 4}
                              fill="var(--surface)"
                              stroke="var(--brand)"
                              strokeWidth={isSelected ? 3 : 2}
                            />
                          </g>
                        );
                      })}
                    </svg>
                  );
                })()}
              </div>

              {/* Axis Boundaries */}
              <div className="flex items-center justify-between text-[10px] text-[var(--text-tertiary)] px-1 font-mono">
                <span>Início: {activeChartPoints[0].dateDisplay}</span>
                <span>Último: {activeChartPoints[activeChartPoints.length - 1].dateDisplay}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          5. RECENT EVOLUTION PHOTOS CAROUSEL / GRID
          ========================================================================= */}
      {latestMilestone?.photos && (
        <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-2xl p-4 space-y-3 shadow-2xs depth-surface">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2.5">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
                Registro Fotográfico
              </span>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                Fotos de {latestMilestone.dateDisplay}
              </h3>
            </div>
            {milestones.length >= 2 && (
              <button
                type="button"
                onClick={() => {
                  if (previousMilestone) {
                    setBeforeDate(previousMilestone.date);
                    setAfterDate(latestMilestone.date);
                  }
                  setIsComparing(true);
                }}
                className="text-xs font-semibold text-[var(--brand)] hover:underline min-h-[44px] flex items-center cursor-pointer"
              >
                Comparar fotos →
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            {EVALUATION_POSES.map((pose) => {
              const img = latestMilestone.photos?.images[pose];
              if (!img) return null;
              return (
                <div
                  key={pose}
                  className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)] p-2 space-y-1.5"
                >
                  <div className="aspect-3/4 rounded-lg bg-[var(--surface-sunken)] overflow-hidden relative flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() =>
                        setZoomImage({
                          url: img.imageUrl,
                          title: `${POSE_LABELS[pose]} (${latestMilestone.dateDisplay})`,
                        })
                      }
                      className="w-full h-full cursor-zoom-in"
                    >
                      <img
                        src={img.imageUrl}
                        alt={`Pose ${POSE_LABELS[pose]}`}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </button>
                  </div>
                  <span className="text-[10px] font-bold text-[var(--text-secondary)] block text-center">
                    {POSE_LABELS[pose]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =========================================================================
          6. ASSESSMENT HISTORY (Most recent first - Rule 18 & 44)
          ========================================================================= */}
      {milestones.length > 0 && (
        <div className="space-y-2.5">
          <span className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block px-1">
            Histórico de Avaliações ({milestones.length})
          </span>

          <div className="space-y-2.5">
            {milestones.map((m, idx) => {
              const isExpanded = expandedMilestoneId === m.id;
              const isFirst = idx === 0;

              return (
                <div
                  key={m.id}
                  className="bg-[var(--surface)] border border-[var(--border-default)] rounded-2xl p-4 space-y-2.5 shadow-2xs depth-surface"
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-[var(--text-primary)]">
                        {m.dateDisplay}
                      </span>
                      {isFirst && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                          Mais recente
                        </span>
                      )}
                    </div>
                    {m.hasPhotos && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400">
                        Com fotos
                      </span>
                    )}
                  </div>

                  {/* Summary Metric Chips */}
                  <div className="flex items-center gap-2 flex-wrap text-xs">
                    {m.measurement?.weightKg !== null && m.measurement?.weightKg !== undefined && (
                      <div className="px-2.5 py-1 rounded-lg bg-[var(--surface-subtle)] border border-[var(--border-subtle)] font-semibold text-[var(--text-primary)]">
                        Peso: <strong>{m.measurement.weightKg} kg</strong>
                      </div>
                    )}
                    {m.measurement?.waistCm !== null && m.measurement?.waistCm !== undefined && (
                      <div className="px-2.5 py-1 rounded-lg bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-[var(--text-secondary)]">
                        Cintura: <strong>{m.measurement.waistCm} cm</strong>
                      </div>
                    )}
                    {m.measurement?.abdomenCm !== null && m.measurement?.abdomenCm !== undefined && (
                      <div className="px-2.5 py-1 rounded-lg bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-[var(--text-secondary)]">
                        Abdômen: <strong>{m.measurement.abdomenCm} cm</strong>
                      </div>
                    )}
                  </div>

                  {/* Expandable Details (Rule 34 & 35: Resumo primeiro, detalhes sob demanda) */}
                  {isExpanded && m.measurement && (
                    <div className="pt-2 border-t border-[var(--border-subtle)] grid grid-cols-2 gap-2 text-xs text-[var(--text-secondary)] animate-in fade-in">
                      <div>Quadril: <strong className="text-[var(--text-primary)]">{m.measurement.hipCm ? `${m.measurement.hipCm} cm` : "—"}</strong></div>
                      <div>Braço: <strong className="text-[var(--text-primary)]">{m.measurement.armCm ? `${m.measurement.armCm} cm` : "—"}</strong></div>
                      <div>Coxa: <strong className="text-[var(--text-primary)]">{m.measurement.thighCm ? `${m.measurement.thighCm} cm` : "—"}</strong></div>
                      {m.measurement.note && (
                        <div className="col-span-2 text-[11px] italic text-[var(--text-tertiary)] pt-1">
                          Nota: {m.measurement.note}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Footer Actions */}
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-[var(--border-subtle)]">
                    <button
                      type="button"
                      onClick={() => setExpandedMilestoneId(isExpanded ? null : m.id)}
                      className="text-xs font-semibold text-[var(--text-tertiary)] hover:text-[var(--text-primary)] py-1 min-h-[44px] flex items-center cursor-pointer"
                    >
                      {isExpanded ? "Ocultar detalhes ▲" : "Ver todas as medidas ▼"}
                    </button>

                    {milestones.length >= 2 && (
                      <button
                        type="button"
                        onClick={() => handleStartComparisonWith(m.date)}
                        className="text-xs font-semibold text-[var(--brand)] hover:underline py-1 min-h-[44px] flex items-center cursor-pointer"
                      >
                        Comparar
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
