"use client";

import React from "react";
import type { PatientAnthropometricEntry } from "@/lib/nutrition-v2/patient-record-types";
import {
  ANTHROPOMETRIC_SOURCE_LABELS,
} from "@/lib/nutrition-v2/patient-record-types";
import { classifyBMI } from "@/lib/nutrition-v2/clinical-calculations/formulas/bmi";
import { calculateWaistToHipRatio } from "@/lib/nutrition-v2/clinical-calculations/formulas/composition";
import { resolveEvaluationBodyComposition } from "@/lib/nutrition-v2/clinical-calculations/formulas/skinfolds";
import type { BiologicalSex } from "@/lib/nutrition-v2/patient-planning-types";

export interface AnthropometricDetailModalProps {
  entry: PatientAnthropometricEntry | null;
  biologicalSex?: BiologicalSex | null;
  patientSex?: BiologicalSex | null;
  ageYears?: number | null;
  patientAgeYears?: number | null;
  isPregnant?: boolean;
  isOpen: boolean;
  onClose: () => void;
  canEdit?: boolean;
  onEdit?: (entry: PatientAnthropometricEntry) => void;
}

export function AnthropometricDetailModal({
  entry,
  biologicalSex,
  patientSex,
  ageYears,
  patientAgeYears,
  isPregnant,
  isOpen,
  onClose,
  canEdit = true,
  onEdit,
}: AnthropometricDetailModalProps) {
  const effectiveSex = biologicalSex || patientSex || null;
  const effectiveAge = ageYears ?? patientAgeYears ?? null;

  if (!isOpen || !entry) return null;

  const formatDate = (dateStr: string) => {
    try {
      const [y, m, d] = dateStr.split("-").map(Number);
      return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
    } catch {
      return dateStr;
    }
  };

  const bmiVal =
    entry.weightKg && entry.heightCm
      ? Number((entry.weightKg / Math.pow(entry.heightCm / 100, 2)).toFixed(1))
      : null;
  const bmiClassification = bmiVal ? classifyBMI(bmiVal, { ageYears: effectiveAge, isPregnant }) : null;

  const whrResult = calculateWaistToHipRatio(entry.waistCm, entry.hipCm, effectiveSex);

  const skinfoldsResult = resolveEvaluationBodyComposition(
    {
      tricepsMm: entry.tricepsMm,
      bicepsMm: entry.bicepsMm,
      subscapularMm: entry.subscapularMm,
      suprailiacMm: entry.suprailiacMm,
      abdominalFoldMm: entry.abdominalFoldMm,
      chestFoldMm: entry.chestFoldMm,
      thighFoldMm: entry.thighFoldMm,
      midaxillaryMm: entry.midaxillaryMm,
      calfFoldMm: entry.calfFoldMm,
    },
    entry.skinfoldProtocol,
    effectiveAge,
    effectiveSex,
    entry.weightKg
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-3xl max-h-[92vh] bg-[var(--surface)] border border-[var(--border-default)] rounded-3xl shadow-2xl flex flex-col overflow-hidden text-[var(--text-primary)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="anthro-detail-title"
      >
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-[var(--border-subtle)] flex items-center justify-between shrink-0 bg-[var(--surface-subtle)]">
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
              Registro Clínico Detalhado
            </span>
            <h2 id="anthro-detail-title" className="text-lg sm:text-xl font-extrabold text-[var(--text-primary)]">
              Avaliação Física de {formatDate(entry.measurementDate)}
            </h2>
            <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
              <span>
                Origem: <strong>{ANTHROPOMETRIC_SOURCE_LABELS[entry.sourceType] || entry.sourceType}</strong>
              </span>
              {entry.createdByName && (
                <>
                  <span>•</span>
                  <span>Registrado por: {entry.createdByName}</span>
                </>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-[var(--surface-hover)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] text-sm font-bold min-h-[40px] min-w-[40px]"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Correction Notice if edited */}
          {entry.editReason && (
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs">
              <span className="font-bold block">Histórico de Correção:</span>
              <p className="mt-0.5">
                &ldquo;{entry.editReason}&rdquo; {entry.updatedByName ? `(por ${entry.updatedByName})` : ""}
              </p>
            </div>
          )}

          {/* 1. Medidas Básicas & IMC */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
              1. Medidas Básicas &amp; Proporção
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
                <span className="text-[10px] text-[var(--text-tertiary)] uppercase font-bold block">Peso</span>
                <span className="text-lg font-extrabold text-[var(--text-primary)] tabular-nums">
                  {entry.weightKg ? `${entry.weightKg} kg` : "—"}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
                <span className="text-[10px] text-[var(--text-tertiary)] uppercase font-bold block">Altura</span>
                <span className="text-lg font-extrabold text-[var(--text-primary)] tabular-nums">
                  {entry.heightCm ? `${entry.heightCm} cm` : "—"}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] col-span-2">
                <span className="text-[10px] text-[var(--text-tertiary)] uppercase font-bold block">IMC</span>
                <span className="text-lg font-extrabold text-[var(--text-primary)] tabular-nums">
                  {bmiVal ? `${bmiVal} kg/m²` : "—"}
                </span>
                {bmiClassification && (
                  <span className="text-[11px] text-emerald-700 dark:text-emerald-300 block font-semibold">
                    {bmiClassification.category} ({bmiClassification.referenceStandard})
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 2. Circunferências */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
              2. Circunferências (cm)
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              {[
                { label: "Cintura", val: entry.waistCm },
                { label: "Quadril", val: entry.hipCm },
                { label: "Abdômen", val: entry.abdomenCm },
                { label: "Pescoço", val: entry.neckCm },
                { label: "Braço Relaxado", val: entry.relaxedArmCm || entry.armCm },
                { label: "Braço Contraído", val: entry.contractedArmCm },
                { label: "Antebraço", val: entry.forearmCm },
                { label: "Tórax / Peitoral", val: entry.chestCm },
                { label: "Coxa Proximal", val: entry.thighCm },
                { label: "Panturrilha", val: entry.calfCm },
              ].map((item, idx) => (
                <div key={idx} className="p-2.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] flex items-center justify-between">
                  <span className="text-[var(--text-secondary)]">{item.label}</span>
                  <span className="font-extrabold text-[var(--text-primary)] tabular-nums">
                    {item.val !== null && item.val !== undefined ? `${item.val} cm` : "—"}
                  </span>
                </div>
              ))}
            </div>

            {whrResult && (
              <div className="p-3 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-xs">
                RCQ: <strong>{whrResult.ratio}</strong> — {whrResult.riskCategory} ({whrResult.referenceStandard})
              </div>
            )}
          </div>

          {/* 3. Dobras Cutâneas & Protocolo */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
              3. Dobras Cutâneas (mm)
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              {[
                { label: "Tríceps", val: entry.tricepsMm },
                { label: "Bíceps", val: entry.bicepsMm },
                { label: "Subescapular", val: entry.subscapularMm },
                { label: "Suprailíaca", val: entry.suprailiacMm },
                { label: "Abdominal", val: entry.abdominalFoldMm },
                { label: "Peitoral", val: entry.chestFoldMm },
                { label: "Coxa", val: entry.thighFoldMm },
                { label: "Axilar Média", val: entry.midaxillaryMm },
                { label: "Panturrilha Medial", val: entry.calfFoldMm },
              ].map((item, idx) => (
                <div key={idx} className="p-2.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] flex items-center justify-between">
                  <span className="text-[var(--text-secondary)]">{item.label}</span>
                  <span className="font-extrabold text-[var(--text-primary)] tabular-nums">
                    {item.val !== null && item.val !== undefined ? `${item.val} mm` : "—"}
                  </span>
                </div>
              ))}
            </div>

            {skinfoldsResult && (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-[var(--text-primary)]">
                    {skinfoldsResult.protocolName}
                  </span>
                  <span className="font-extrabold text-emerald-700 dark:text-emerald-300 text-sm">
                    {skinfoldsResult.effectiveBodyFatPct ? `${skinfoldsResult.effectiveBodyFatPct}% Gordura` : "Incompleto"}
                  </span>
                </div>
                {skinfoldsResult.isComplete && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px] text-[var(--text-secondary)]">
                    <div>Soma das Dobras: <strong>{skinfoldsResult.sumSkinfoldsMm} mm</strong></div>
                    {skinfoldsResult.bodyDensity && (
                      <div>Densidade: <strong>{skinfoldsResult.bodyDensity} g/ml</strong></div>
                    )}
                    {skinfoldsResult.fatMassKg && (
                      <div>Massa Gorda: <strong>{skinfoldsResult.fatMassKg} kg</strong></div>
                    )}
                    {skinfoldsResult.leanMassKg && (
                      <div>Massa Magra: <strong>{skinfoldsResult.leanMassKg} kg</strong></div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 4. Composição Corporal & Massa Óssea */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
              4. Composição Corporal por Equipamento
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="p-2.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
                <span className="text-[var(--text-secondary)] block text-[10px]">Gordura Corporal</span>
                <span className="font-extrabold text-[var(--text-primary)] text-sm tabular-nums">
                  {entry.bodyFatPct !== null ? `${entry.bodyFatPct}%` : "—"}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
                <span className="text-[var(--text-secondary)] block text-[10px]">Massa Magra (FFM)</span>
                <span className="font-extrabold text-[var(--text-primary)] text-sm tabular-nums">
                  {entry.leanMassKg !== null ? `${entry.leanMassKg} kg` : "—"}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
                <span className="text-[var(--text-secondary)] block text-[10px]">Massa Muscular</span>
                <span className="font-extrabold text-[var(--text-primary)] text-sm tabular-nums">
                  {entry.muscleMassKg !== null ? `${entry.muscleMassKg} kg` : "—"}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
                <span className="text-[var(--text-secondary)] block text-[10px]">Massa Gorda</span>
                <span className="font-extrabold text-[var(--text-primary)] text-sm tabular-nums">
                  {entry.fatMassKg !== null ? `${entry.fatMassKg} kg` : "—"}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
                <span className="text-[var(--text-secondary)] block text-[10px]">Água Corporal</span>
                <span className="font-extrabold text-[var(--text-primary)] text-sm tabular-nums">
                  {entry.bodyWaterPct !== null ? `${entry.bodyWaterPct}%` : entry.bodyWaterKg !== null ? `${entry.bodyWaterKg} kg` : "—"}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
                <span className="text-[var(--text-secondary)] block text-[10px]">Massa Óssea Medida</span>
                <span className="font-extrabold text-[var(--text-primary)] text-sm tabular-nums">
                  {entry.boneMassValue !== null
                    ? `${entry.boneMassValue} ${entry.boneMassUnit || "kg"} ${entry.boneMassMethod ? `(${entry.boneMassMethod})` : ""}`
                    : "—"}
                </span>
              </div>
            </div>
          </div>

          {/* 5. Observações Clínicas */}
          {entry.notes && (
            <div className="space-y-1">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
                Observações Clínicas
              </h3>
              <p className="p-3.5 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] leading-relaxed">
                {entry.notes}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-[var(--border-subtle)] flex items-center justify-between shrink-0 bg-[var(--surface-subtle)]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-[var(--border-default)] text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] transition-colors min-h-[44px] cursor-pointer"
          >
            Fechar
          </button>

          {onEdit && canEdit && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit(entry);
              }}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors min-h-[44px] cursor-pointer"
            >
              Corrigir Medição →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
