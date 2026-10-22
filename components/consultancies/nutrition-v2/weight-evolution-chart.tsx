"use client";

import React, { useState, useMemo } from "react";
import type { PatientAnthropometricEntry } from "@/lib/nutrition-v2/patient-record-types";

interface WeightEvolutionChartProps {
  entries: PatientAnthropometricEntry[];
  reportedWeightKg?: number | null;
  reportedWeightDate?: string | null;
  onSelectEntry?: (entry: PatientAnthropometricEntry) => void;
  onEditEntry?: (entry: PatientAnthropometricEntry) => void;
}

type PeriodFilter = "30D" | "90D" | "6M" | "1Y" | "ALL";

export function WeightEvolutionChart({
  entries,
  onSelectEntry,
  onEditEntry,
}: WeightEvolutionChartProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodFilter>("ALL");
  const [hoveredEntry, setHoveredEntry] = useState<PatientAnthropometricEntry | null>(null);

  // Filter entries having a recorded weight
  const validWeightEntries = useMemo(() => {
    return entries
      .filter((e) => e.weightKg !== null && e.weightKg > 0)
      .sort((a, b) => new Date(a.measurementDate).getTime() - new Date(b.measurementDate).getTime());
  }, [entries]);

  // Filter by period
  const filteredEntries = useMemo(() => {
    if (selectedPeriod === "ALL") return validWeightEntries;
    if (validWeightEntries.length === 0) return [];

    const now = new Date().getTime();
    let daysCutoff = 30;
    if (selectedPeriod === "90D") daysCutoff = 90;
    else if (selectedPeriod === "6M") daysCutoff = 180;
    else if (selectedPeriod === "1Y") daysCutoff = 365;

    const cutoffTime = now - daysCutoff * 24 * 60 * 60 * 1000;
    const filtered = validWeightEntries.filter(
      (e) => new Date(e.measurementDate).getTime() >= cutoffTime
    );

    // If filtering yielded fewer than 2 points but we have more in total, fall back to at least 2 points
    return filtered.length > 0 ? filtered : validWeightEntries.slice(-2);
  }, [validWeightEntries, selectedPeriod]);

  // SVG Chart Dimensions & Computations
  const chartData = useMemo(() => {
    if (filteredEntries.length === 0) return null;

    const weights = filteredEntries.map((e) => e.weightKg!);
    const minW = Math.min(...weights);
    const maxW = Math.max(...weights);

    // Padding for Y-axis (at least 2kg range)
    const padding = Math.max(1, (maxW - minW) * 0.15 || 2);
    const yMin = Math.max(0, Math.floor(minW - padding));
    const yMax = Math.ceil(maxW + padding);

    const width = 800;
    const height = 300;
    const paddingLeft = 60;
    const paddingRight = 40;
    const paddingTop = 30;
    const paddingBottom = 50;

    const usableWidth = width - paddingLeft - paddingRight;
    const usableHeight = height - paddingTop - paddingBottom;

    const points = filteredEntries.map((entry, idx) => {
      let x = paddingLeft;
      if (filteredEntries.length > 1) {
        x = paddingLeft + (idx / (filteredEntries.length - 1)) * usableWidth;
      } else {
        x = paddingLeft + usableWidth / 2;
      }

      const yPercent = (entry.weightKg! - yMin) / (yMax - yMin || 1);
      const y = paddingTop + usableHeight - yPercent * usableHeight;

      return {
        x,
        y,
        entry,
        isProfessional: entry.sourceType !== "PATIENT_REPORTED",
      };
    });

    // Generate SVG path line
    const pathD = points.reduce((acc, pt, idx) => {
      return idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
    }, "");

    // Y-axis guide ticks (4 ticks)
    const yTicks = [0, 0.33, 0.66, 1].map((pct) => {
      const val = yMin + pct * (yMax - yMin);
      const yPos = paddingTop + usableHeight - pct * usableHeight;
      return { val: Number(val.toFixed(1)), yPos };
    });

    return {
      width,
      height,
      points,
      pathD,
      yTicks,
      minW,
      maxW,
      latest: filteredEntries[filteredEntries.length - 1],
      first: filteredEntries[0],
      deltaKg:
        filteredEntries.length > 1
          ? Number(
              (
                filteredEntries[filteredEntries.length - 1].weightKg! -
                filteredEntries[0].weightKg!
              ).toFixed(1)
            )
          : 0,
    };
  }, [filteredEntries]);

  const formatDate = (dateStr: string) => {
    try {
      const [y, m, d] = dateStr.split("-").map(Number);
      return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
    } catch {
      return dateStr;
    }
  };

  const calculateBmi = (weightKg: number | null, heightCm: number | null) => {
    if (!weightKg || !heightCm) return null;
    const hM = heightCm / 100;
    return (weightKg / (hM * hM)).toFixed(1);
  };

  return (
    <div className="space-y-4">
      {/* Header with Period Selectors */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[var(--surface)] border border-[var(--border-default)] p-4 sm:p-5 rounded-2xl shadow-xs">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
            Evolução Ponderal Temporal
          </span>
          <h3 className="text-base sm:text-lg font-extrabold text-[var(--text-primary)]">
            Gráfico de Peso Corporal
          </h3>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Registro cronológico das avaliações físicas reais. Sem interpolações fictícias.
          </p>
        </div>

        {/* Period filter buttons */}
        <div className="flex items-center gap-1 bg-[var(--surface-subtle)] p-1 rounded-xl border border-[var(--border-subtle)] shrink-0 overflow-x-auto">
          {(
            [
              { id: "30D", label: "30D" },
              { id: "90D", label: "90D" },
              { id: "6M", label: "6M" },
              { id: "1Y", label: "1A" },
              { id: "ALL", label: "Tudo" },
            ] as const
          ).map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => setSelectedPeriod(filter.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer min-h-[36px] ${
                selectedPeriod === filter.id
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Chart Body */}
      {chartData ? (
        <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-3xl p-4 sm:p-6 shadow-xs space-y-4">
          {/* Quick Metrics Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
              <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase block">
                Último Peso
              </span>
              <span className="text-lg sm:text-xl font-extrabold text-[var(--text-primary)] tabular-nums">
                {chartData.latest.weightKg} kg
              </span>
              <span className="text-[10px] text-[var(--text-secondary)] block mt-0.5">
                {formatDate(chartData.latest.measurementDate)}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
              <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase block">
                Ponto Inicial
              </span>
              <span className="text-lg sm:text-xl font-extrabold text-[var(--text-primary)] tabular-nums">
                {chartData.first.weightKg} kg
              </span>
              <span className="text-[10px] text-[var(--text-secondary)] block mt-0.5">
                {formatDate(chartData.first.measurementDate)}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
              <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase block">
                Variação no Período
              </span>
              <span className="text-lg sm:text-xl font-extrabold text-[var(--text-primary)] tabular-nums">
                {chartData.deltaKg > 0 ? `+${chartData.deltaKg}` : chartData.deltaKg} kg
              </span>
              <span className="text-[10px] text-[var(--text-tertiary)] block mt-0.5">
                Diferença líquida absoluta
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
              <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase block">
                Total de Medições
              </span>
              <span className="text-lg sm:text-xl font-extrabold text-[var(--text-primary)] tabular-nums">
                {filteredEntries.length}
              </span>
              <span className="text-[10px] text-[var(--text-secondary)] block mt-0.5">
                registros datados
              </span>
            </div>
          </div>

          {/* SVG Canvas Area */}
          <div className="relative w-full overflow-hidden">
            <svg
              viewBox={`0 0 ${chartData.width} ${chartData.height}`}
              className="w-full h-auto max-h-[360px] select-none"
            >
              {/* Horizontal Grid lines */}
              {chartData.yTicks.map((tick, idx) => (
                <g key={idx}>
                  <line
                    x1="60"
                    y1={tick.yPos}
                    x2={chartData.width - 40}
                    y2={tick.yPos}
                    stroke="currentColor"
                    className="text-[var(--border-subtle)] opacity-60"
                    strokeDasharray="4 4"
                    strokeWidth="1"
                  />
                  <text
                    x="50"
                    y={tick.yPos + 4}
                    textAnchor="end"
                    className="fill-[var(--text-tertiary)] text-[11px] font-medium tabular-nums"
                  >
                    {tick.val} kg
                  </text>
                </g>
              ))}

              {/* Connecting line */}
              {chartData.points.length > 1 && (
                <path
                  d={chartData.pathD}
                  fill="none"
                  stroke="currentColor"
                  className="text-emerald-500"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Interactive Points */}
              {chartData.points.map((pt, idx) => {
                const isSelected = hoveredEntry?.publicId === pt.entry.publicId;
                return (
                  <g
                    key={idx}
                    className="cursor-pointer"
                    onClick={() => {
                      setHoveredEntry(pt.entry);
                      if (onSelectEntry) onSelectEntry(pt.entry);
                    }}
                    onMouseEnter={() => setHoveredEntry(pt.entry)}
                  >
                    {/* Larger transparent hit area for touch/mouse */}
                    <circle cx={pt.x} cy={pt.y} r="18" fill="transparent" />

                    {/* Outer pulse when selected */}
                    {isSelected && (
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r="12"
                        className="fill-emerald-500/20 stroke-emerald-500 animate-pulse"
                        strokeWidth="2"
                      />
                    )}

                    {/* Data point circle */}
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={pt.isProfessional ? "6" : "5"}
                      className={
                        pt.isProfessional
                          ? "fill-emerald-600 stroke-white dark:stroke-zinc-900"
                          : "fill-sky-500 stroke-white dark:stroke-zinc-900 stroke-dashed"
                      }
                      strokeWidth="2.5"
                    />

                    {/* Date label on X-axis */}
                    <text
                      x={pt.x}
                      y={chartData.height - 18}
                      textAnchor="middle"
                      className="fill-[var(--text-tertiary)] text-[10px] font-semibold tabular-nums"
                    >
                      {formatDate(pt.entry.measurementDate).slice(0, 5)}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Active / Hovered Point Detail Card */}
          {hoveredEntry && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs animate-in fade-in duration-150">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-[var(--text-primary)] text-sm tabular-nums">
                    {hoveredEntry.weightKg} kg
                  </span>
                  <span className="text-[var(--text-secondary)]">•</span>
                  <span className="font-semibold text-[var(--text-secondary)]">
                    {formatDate(hoveredEntry.measurementDate)}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      hoveredEntry.sourceType === "PATIENT_REPORTED"
                        ? "bg-sky-500/20 text-sky-700 dark:text-sky-300"
                        : "bg-emerald-500/20 text-emerald-800 dark:text-emerald-200"
                    }`}
                  >
                    {hoveredEntry.sourceType === "PATIENT_REPORTED"
                      ? "Informado pelo Paciente"
                      : "Avaliação Profissional"}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-[11px] text-[var(--text-secondary)] flex-wrap">
                  {hoveredEntry.heightCm && (
                    <span>Altura: {hoveredEntry.heightCm} cm</span>
                  )}
                  {calculateBmi(hoveredEntry.weightKg, hoveredEntry.heightCm) && (
                    <span>
                      IMC:{" "}
                      <strong>
                        {calculateBmi(hoveredEntry.weightKg, hoveredEntry.heightCm)} kg/m²
                      </strong>
                    </span>
                  )}
                  {hoveredEntry.bodyFatPct && (
                    <span>Gordura: {hoveredEntry.bodyFatPct}%</span>
                  )}
                  {hoveredEntry.equipmentMethod && (
                    <span>Método: {hoveredEntry.equipmentMethod}</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {onSelectEntry && (
                  <button
                    type="button"
                    onClick={() => onSelectEntry(hoveredEntry)}
                    className="px-3 py-1.5 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border-default)] font-bold text-xs text-[var(--text-primary)] transition-colors cursor-pointer min-h-[36px]"
                  >
                    Ver Todas as Medidas
                  </button>
                )}
                {onEditEntry && (
                  <button
                    type="button"
                    onClick={() => onEditEntry(hoveredEntry)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors cursor-pointer min-h-[36px]"
                  >
                    Corrigir Entrada
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Legend */}
          <div className="flex items-center justify-between text-[11px] text-[var(--text-tertiary)] pt-2 border-t border-[var(--border-subtle)] flex-wrap gap-2">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-emerald-600 inline-block" />
                <span>Avaliação registrada pelo nutricionista</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-sky-500 inline-block" />
                <span>Peso informado pelo paciente</span>
              </div>
            </div>
            <span>Toque ou clique em um ponto para detalhes</span>
          </div>
        </div>
      ) : (
        <div className="p-8 text-center bg-[var(--surface)] border border-[var(--border-default)] rounded-3xl space-y-2">
          <span className="text-3xl block">⚖️</span>
          <h4 className="font-bold text-sm text-[var(--text-primary)]">
            Nenhuma medição de peso no período
          </h4>
          <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto">
            Registre a primeira avaliação física para iniciar o acompanhamento gráfico do paciente.
          </p>
        </div>
      )}
    </div>
  );
}
