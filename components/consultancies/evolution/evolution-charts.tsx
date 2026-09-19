"use client";

import React, { useState } from "react";
import type { ChartDataPointDto } from "@/types/evolution";

interface NativeLineChartProps {
  title: string;
  unit: string;
  points: ChartDataPointDto[];
  strokeColor?: string;
  fillGradientId?: string;
}

export function NativeLineChart({
  title,
  unit,
  points,
  strokeColor = "var(--brand)",
  fillGradientId = "brandGradient",
}: NativeLineChartProps) {
  const [activePointIndex, setActivePointIndex] = useState<number | null>(null);

  if (points.length === 0) {
    return (
      <div className="p-6 text-center rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-1">
        <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
          {title}
        </h4>
        <p className="text-xs text-[var(--text-secondary)]">
          Nenhum dado registrado para este gráfico ainda.
        </p>
      </div>
    );
  }

  // Single point case (Rule 10: 1 ponto -> estado válido)
  if (points.length === 1) {
    const single = points[0];
    return (
      <div className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
            {title} ({unit})
          </h4>
          <span className="text-xs text-[var(--text-tertiary)]">1 registro</span>
        </div>
        <div className="flex items-baseline gap-3 p-4 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
          <span className="text-2xl font-bold text-[var(--text-primary)] tabular-nums">
            {single.formattedValue}
          </span>
          <span className="text-xs text-[var(--text-secondary)]">
            Registrado em {single.dateDisplay}
          </span>
        </div>
      </div>
    );
  }

  // Multi-point SVG chart
  const width = 600;
  const height = 220;
  const paddingLeft = 48;
  const paddingRight = 24;
  const paddingTop = 20;
  const paddingBottom = 32;

  const innerWidth = width - paddingLeft - paddingRight;
  const innerHeight = height - paddingTop - paddingBottom;

  const values = points.map((p) => p.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const valRange = maxVal - minVal;

  // Add comfortable padding to avoid edge clipping
  const yPadding = valRange > 0 ? valRange * 0.15 : 2;
  const yMin = Math.floor((minVal - yPadding) * 10) / 10;
  const yMax = Math.ceil((maxVal + yPadding) * 10) / 10;
  const yDomain = yMax - yMin || 1;

  // Map each point to (x, y) coordinates
  const coords = points.map((p, idx) => {
    const x = paddingLeft + (idx / (points.length - 1)) * innerWidth;
    const y = paddingTop + innerHeight - ((p.value - yMin) / yDomain) * innerHeight;
    return { x, y, point: p };
  });

  // Straight line segments (Rule 10: sem curva suavizada inventada)
  const linePathD = coords.reduce((acc, c, idx) => {
    return idx === 0 ? `M ${c.x} ${c.y}` : `${acc} L ${c.x} ${c.y}`;
  }, "");

  // Area under the line
  const areaPathD = `${linePathD} L ${coords[coords.length - 1].x} ${paddingTop + innerHeight} L ${coords[0].x} ${paddingTop + innerHeight} Z`;

  // Y-axis tick values (3 ticks)
  const yTicks = [
    yMin,
    Math.round(((yMin + yMax) / 2) * 10) / 10,
    yMax,
  ];

  const activeCoord = activePointIndex !== null ? coords[activePointIndex] : null;

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xs space-y-3 depth-surface">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
            {title} ({unit})
          </h4>
          <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">
            Evolução temporal com medições reais ({points.length} registros)
          </p>
        </div>

        {activeCoord && (
          <div className="text-right">
            <span className="text-xs font-bold text-[var(--text-primary)] tabular-nums block">
              {activeCoord.point.formattedValue}
            </span>
            <span className="text-[10px] text-[var(--text-tertiary)] block">
              {activeCoord.point.date}
            </span>
          </div>
        )}
      </div>

      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto select-none"
          preserveAspectRatio="xMidYMid meet"
          aria-label={`Gráfico de ${title}`}
        >
          <defs>
            <linearGradient id={fillGradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={strokeColor} stopOpacity="0.25" />
              <stop offset="100%" stopColor={strokeColor} stopOpacity="0.01" />
            </linearGradient>
          </defs>

          {/* Horizontal grid lines & Y labels */}
          {yTicks.map((tickVal, i) => {
            const yPos = paddingTop + innerHeight - ((tickVal - yMin) / yDomain) * innerHeight;
            return (
              <g key={`ytick-${i}`}>
                <line
                  x1={paddingLeft}
                  y1={yPos}
                  x2={width - paddingRight}
                  y2={yPos}
                  stroke="var(--border-subtle)"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />
                <text
                  x={paddingLeft - 8}
                  y={yPos + 3}
                  textAnchor="end"
                  className="fill-[var(--text-tertiary)] text-[10px] font-mono"
                >
                  {tickVal.toLocaleString("pt-BR", { minimumFractionDigits: 1 })}
                </text>
              </g>
            );
          })}

          {/* Area Fill */}
          <path d={areaPathD} fill={`url(#${fillGradientId})`} />

          {/* Line Path (straight segments) */}
          <path
            d={linePathD}
            fill="none"
            stroke={strokeColor}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data Points */}
          {coords.map((c, idx) => {
            const isActive = activePointIndex === idx;
            return (
              <g key={`pt-${idx}`}>
                {/* Larger invisible hit area for touch/hover */}
                <circle
                  cx={c.x}
                  cy={c.y}
                  r="14"
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => setActivePointIndex(idx)}
                  onMouseLeave={() => setActivePointIndex(null)}
                  onClick={() => setActivePointIndex(isActive ? null : idx)}
                  tabIndex={0}
                  role="button"
                  aria-label={`${c.point.formattedValue} em ${c.point.date}`}
                  onFocus={() => setActivePointIndex(idx)}
                  onBlur={() => setActivePointIndex(null)}
                />
                {/* Visible dot */}
                <circle
                  cx={c.x}
                  cy={c.y}
                  r={isActive ? "5.5" : "3.5"}
                  fill="var(--surface)"
                  stroke={strokeColor}
                  strokeWidth={isActive ? "3" : "2"}
                  className="transition-all duration-150 pointer-events-none"
                />
              </g>
            );
          })}

          {/* X Axis Labels (first, middle, last) */}
          {coords.length > 0 && (
            <text
              x={coords[0].x}
              y={height - 10}
              textAnchor="start"
              className="fill-[var(--text-tertiary)] text-[10px] font-mono"
            >
              {coords[0].point.dateDisplay}
            </text>
          )}

          {coords.length > 2 && (
            <text
              x={coords[Math.floor(coords.length / 2)].x}
              y={height - 10}
              textAnchor="middle"
              className="fill-[var(--text-tertiary)] text-[10px] font-mono"
            >
              {coords[Math.floor(coords.length / 2)].point.dateDisplay}
            </text>
          )}

          {coords.length > 1 && (
            <text
              x={coords[coords.length - 1].x}
              y={height - 10}
              textAnchor="end"
              className="fill-[var(--text-tertiary)] text-[10px] font-mono"
            >
              {coords[coords.length - 1].point.dateDisplay}
            </text>
          )}
        </svg>
      </div>

      <div className="flex items-center justify-between text-[11px] text-[var(--text-tertiary)] px-1 pt-1 border-t border-[var(--border-subtle)]">
        <span>Primeiro: {points[0].formattedValue}</span>
        <span>Último: {points[points.length - 1].formattedValue}</span>
      </div>
    </div>
  );
}

interface EvolutionChartsProps {
  weightSeries: ChartDataPointDto[];
  waistSeries: ChartDataPointDto[];
  abdomenSeries: ChartDataPointDto[];
}

export function EvolutionCharts({
  weightSeries,
  waistSeries,
  abdomenSeries,
}: EvolutionChartsProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <NativeLineChart
          title="Curva de Peso Corporal"
          unit="kg"
          points={weightSeries}
          strokeColor="var(--brand)"
          fillGradientId="weightGrad"
        />
        <NativeLineChart
          title="Circunferência da Cintura"
          unit="cm"
          points={waistSeries}
          strokeColor="#0284c7"
          fillGradientId="waistGrad"
        />
      </div>

      {abdomenSeries.length > 0 && (
        <div className="max-w-xl">
          <NativeLineChart
            title="Circunferência do Abdômen"
            unit="cm"
            points={abdomenSeries}
            strokeColor="#8b5cf6"
            fillGradientId="abdomenGrad"
          />
        </div>
      )}
    </div>
  );
}
