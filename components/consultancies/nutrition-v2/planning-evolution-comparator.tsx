"use client";

import React, { useState, useMemo } from "react";
import type { PatientAnthropometricEntry } from "@/lib/nutrition-v2/patient-record-types";
import { calculateEvolutionDelta } from "@/lib/nutrition-v2/clinical-measurements-catalog";

interface PlanningEvolutionComparatorProps {
  entries: PatientAnthropometricEntry[];
}

export function PlanningEvolutionComparator({ entries }: PlanningEvolutionComparatorProps) {
  // Sort entries newest first
  const sorted = useMemo(() => {
    return [...entries].sort(
      (a, b) => new Date(b.measurementDate).getTime() - new Date(a.measurementDate).getTime()
    );
  }, [entries]);

  const [currentId, setCurrentId] = useState<string>(sorted[0]?.publicId || "");
  const [baseId, setBaseId] = useState<string>(sorted[1]?.publicId || sorted[0]?.publicId || "");

  const currentEntry = useMemo(() => sorted.find((e) => e.publicId === currentId) || sorted[0] || null, [sorted, currentId]);
  const baseEntry = useMemo(() => sorted.find((e) => e.publicId === baseId) || sorted[1] || sorted[0] || null, [sorted, baseId]);

  if (sorted.length < 2) {
    return (
      <div className="p-5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)] text-xs text-[var(--text-tertiary)] text-center">
        Registre pelo menos duas avaliações físicas para comparar a evolução temporal do paciente.
      </div>
    );
  }

  const formatDate = (isoStr?: string | null) => {
    if (!isoStr) return "—";
    try {
      const d = new Date(isoStr.includes("T") ? isoStr : `${isoStr}T12:00:00`);
      return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
    } catch {
      return isoStr;
    }
  };

  // Metrics to compare
  const metrics: Array<{ label: string; current: number | null | undefined; base: number | null | undefined; isPercentage: boolean; unit: string }> = [
    { label: "Peso Corporal", current: currentEntry?.weightKg, base: baseEntry?.weightKg, isPercentage: false, unit: "kg" },
    { label: "Gordura Corporal", current: currentEntry?.bodyFatPct, base: baseEntry?.bodyFatPct, isPercentage: true, unit: "%" },
    { label: "Massa Gorda (kg)", current: currentEntry?.fatMassKg, base: baseEntry?.fatMassKg, isPercentage: false, unit: "kg" },
    { label: "Massa Livre de Gordura", current: currentEntry?.leanMassKg, base: baseEntry?.leanMassKg, isPercentage: false, unit: "kg" },
    { label: "Massa Muscular", current: currentEntry?.muscleMassKg, base: baseEntry?.muscleMassKg, isPercentage: false, unit: "kg" },
    { label: "Cintura", current: currentEntry?.waistCm, base: baseEntry?.waistCm, isPercentage: false, unit: "cm" },
    { label: "Abdômen", current: currentEntry?.abdomenCm, base: baseEntry?.abdomenCm, isPercentage: false, unit: "cm" },
    { label: "Quadril", current: currentEntry?.hipCm, base: baseEntry?.hipCm, isPercentage: false, unit: "cm" },
    { label: "Braço Relaxado", current: currentEntry?.relaxedArmCm ?? currentEntry?.armCm, base: baseEntry?.relaxedArmCm ?? baseEntry?.armCm, isPercentage: false, unit: "cm" },
    { label: "Coxa", current: currentEntry?.thighCm, base: baseEntry?.thighCm, isPercentage: false, unit: "cm" },
  ];

  return (
    <div className="p-5 sm:p-6 rounded-3xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs space-y-4">
      {/* Header and Selectors */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[var(--border-subtle)] gap-3">
        <div>
          <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block tracking-wider">
            Comparador Temporal Clínico
          </span>
          <h4 className="text-sm sm:text-base font-bold text-[var(--text-primary)]">
            Comparação Entre Avaliações
          </h4>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-[var(--text-tertiary)] font-bold">Base:</span>
            <select
              value={baseId}
              onChange={(e) => setBaseId(e.target.value)}
              className="px-2.5 py-1 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-emerald-500 min-h-[36px]"
            >
              {sorted.map((e) => (
                <option key={e.publicId} value={e.publicId}>
                  {formatDate(e.measurementDate)} {e.weightKg ? `(${e.weightKg} kg)` : ""}
                </option>
              ))}
            </select>
          </div>

          <span className="text-[var(--text-tertiary)]">→</span>

          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-[var(--text-tertiary)] font-bold">Atual:</span>
            <select
              value={currentId}
              onChange={(e) => setCurrentId(e.target.value)}
              className="px-2.5 py-1 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-emerald-500 min-h-[36px]"
            >
              {sorted.map((e) => (
                <option key={e.publicId} value={e.publicId}>
                  {formatDate(e.measurementDate)} {e.weightKg ? `(${e.weightKg} kg)` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Comparison Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {metrics.map((m, idx) => {
          const delta = calculateEvolutionDelta(m.current, m.base, m.isPercentage);
          const hasValues = m.current != null || m.base != null;

          if (!hasValues) return null;

          return (
            <div
              key={idx}
              className="p-3.5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)] space-y-1"
            >
              <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block">
                {m.label}
              </span>

              <div className="flex items-baseline justify-between">
                <span className="text-base font-extrabold text-[var(--text-primary)] tabular-nums">
                  {m.current != null ? `${m.current} ${m.unit}` : "—"}
                </span>
                <span className="text-[11px] text-[var(--text-tertiary)] tabular-nums">
                  antes: {m.base != null ? `${m.base} ${m.unit}` : "—"}
                </span>
              </div>

              {/* Delta with distinction of p.p. vs % */}
              <div className="pt-1 border-t border-[var(--border-subtle)] text-[11px] font-bold">
                {delta.absoluteDelta !== null ? (
                  <span
                    className={
                      delta.absoluteDelta > 0
                        ? "text-blue-600 dark:text-blue-400"
                        : delta.absoluteDelta < 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-[var(--text-tertiary)]"
                    }
                  >
                    {delta.displayText}
                  </span>
                ) : (
                  <span className="text-[10px] text-[var(--text-tertiary)]">{delta.displayText}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[10px] text-[var(--text-tertiary)] pt-1">
        * Diferença percentual em grandezas como % de Gordura é expressa em <strong>pontos percentuais (p.p.)</strong> para rigor clínico.
      </p>
    </div>
  );
}
