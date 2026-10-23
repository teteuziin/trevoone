"use client";

import React, { useMemo } from "react";
import type { PatientAnthropometricEntry } from "@/lib/nutrition-v2/patient-record-types";
import { deriveTwoComponentModel } from "@/lib/nutrition-v2/clinical-measurements-catalog";

interface PlanningBodyCompositionSectionProps {
  entry: PatientAnthropometricEntry | null;
  onEdit?: () => void;
  canEdit?: boolean;
}

export function PlanningBodyCompositionSection({
  entry,
  onEdit,
  canEdit = true,
}: PlanningBodyCompositionSectionProps) {
  const bodyComp = entry?.bodyComposition;

  // Harmonized values
  const weightKg = bodyComp?.weightKg ?? entry?.weightKg;
  const bodyFatPct = bodyComp?.bodyFatPct ?? entry?.bodyFatPct;
  const fatMassKg = bodyComp?.bodyFatKg ?? entry?.fatMassKg;
  const leanMassKg = bodyComp?.leanMassKg ?? entry?.leanMassKg;
  const muscleMassKg = bodyComp?.muscleMassKg ?? entry?.muscleMassKg;
  const bodyWaterPct = bodyComp?.bodyWaterPct ?? entry?.bodyWaterPct;
  const bodyWaterKg = bodyComp?.bodyWaterKg ?? entry?.bodyWaterKg;
  const boneMassValue = bodyComp?.boneMassValue ?? entry?.boneMassValue;
  const boneMassUnit = bodyComp?.boneMassUnit ?? entry?.boneMassUnit ?? "kg";
  const method = bodyComp?.method ?? entry?.equipmentMethod ?? "OTHER";
  const equipment = bodyComp?.equipment ?? entry?.equipmentMethod ?? null;
  const protocol = bodyComp?.protocol ?? entry?.skinfoldProtocol ?? null;
  const origin = bodyComp?.origin ?? (entry?.sourceType === "PATIENT_REPORTED" ? "REPORTED" : "RECORDED");

  // Two-Component Model calculation & Inconsistency check
  const twoCompModel = useMemo(() => {
    return deriveTwoComponentModel({
      weightKg,
      bodyFatKg: fatMassKg,
      leanMassKg,
      bodyFatPct,
      leanMassPct: null,
    });
  }, [weightKg, fatMassKg, leanMassKg, bodyFatPct]);

  if (!entry) {
    return (
      <div className="p-8 rounded-3xl border border-dashed border-[var(--border-default)] bg-[var(--surface-subtle)] text-center space-y-2">
        <p className="text-sm font-semibold text-[var(--text-secondary)]">
          Nenhuma avaliação de composição corporal registrada.
        </p>
      </div>
    );
  }

  const methodLabels: Record<string, string> = {
    BIOIMPEDANCE: "Bioimpedância Elétrica (BIA)",
    SKINFOLDS: "Adipometria por Dobras Cutâneas",
    DEXA: "Absortometria de Raio-X de Dupla Energia (DEXA)",
    HYDROSTATIC: "Pesagem Hidrostática",
    BOD_POD: "Pletismografia (BOD POD)",
    OTHER: "Outro Método Clínico",
  };

  return (
    <div className="p-5 sm:p-6 rounded-3xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)] flex-wrap gap-2">
        <div>
          <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block tracking-wider">
            Fracionamento Corporal & Modelo Bicopartimental (2C)
          </span>
          <h3 className="text-base font-bold text-[var(--text-primary)]">
            Composição Corporal
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            {methodLabels[method] || method}
          </span>
          {canEdit && onEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="px-2.5 py-1 rounded-lg border border-[var(--border-subtle)] hover:bg-[var(--surface-subtle)] text-xs font-bold text-[var(--text-secondary)] transition-all cursor-pointer min-h-[36px]"
            >
              Editar
            </button>
          )}
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Peso Total */}
        <div className="p-4 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-1">
          <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block">
            Peso Total
          </span>
          <span className="text-xl font-extrabold text-[var(--text-primary)] tabular-nums block">
            {weightKg != null ? `${weightKg} kg` : "—"}
          </span>
          <span className="text-[11px] text-[var(--text-tertiary)] block">
            Base da avaliação
          </span>
        </div>

        {/* Massa Gorda (kg e %) */}
        <div className="p-4 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-1">
          <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block">
            Massa Gorda (FM)
          </span>
          <span className="text-xl font-extrabold text-amber-600 dark:text-amber-400 tabular-nums block">
            {fatMassKg != null ? `${fatMassKg} kg` : twoCompModel.bodyFatKg != null ? `${twoCompModel.bodyFatKg} kg` : "—"}
          </span>
          <span className="text-[11px] font-bold text-[var(--text-secondary)] block">
            {bodyFatPct != null ? `${bodyFatPct}%` : twoCompModel.bodyFatPct != null ? `${twoCompModel.bodyFatPct}%` : "—"}
          </span>
        </div>

        {/* Massa Livre de Gordura (kg e %) */}
        <div className="p-4 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-1">
          <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block">
            Massa Livre (FFM)
          </span>
          <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums block">
            {leanMassKg != null ? `${leanMassKg} kg` : twoCompModel.leanMassKg != null ? `${twoCompModel.leanMassKg} kg` : "—"}
          </span>
          <span className="text-[11px] font-bold text-[var(--text-secondary)] block">
            {twoCompModel.leanMassPct != null ? `${twoCompModel.leanMassPct}%` : "—"}
          </span>
        </div>

        {/* Massa Muscular (kg) - CAMPO SEPARADO */}
        <div className="p-4 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block">
              Massa Muscular
            </span>
            <span className="text-[9px] uppercase px-1 rounded font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400">
              Campo Específico
            </span>
          </div>
          <span className="text-xl font-extrabold text-blue-600 dark:text-blue-400 tabular-nums block">
            {muscleMassKg != null ? `${muscleMassKg} kg` : "—"}
          </span>
          <span className="text-[11px] text-[var(--text-tertiary)] block">
            {muscleMassKg != null && weightKg != null ? `${((muscleMassKg / weightKg) * 100).toFixed(1)}% do peso` : "Músculo esquelético"}
          </span>
        </div>
      </div>

      {/* Model 2C Integrity Box */}
      <div className="p-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)] space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className="text-xs font-bold text-[var(--text-primary)]">
            Equilíbrio do Modelo 2 Componentes (Massa Gorda + Massa Livre de Gordura = Peso)
          </span>
          <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded-md ${
            twoCompModel.isInconsistent
              ? "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
              : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
          }`}>
            {twoCompModel.isInconsistent ? "Divergência Detectada" : "Consistente (2C)"}
          </span>
        </div>

        {/* Progress Bar 2C */}
        {twoCompModel.bodyFatPct != null && twoCompModel.leanMassPct != null && (
          <div className="space-y-1.5">
            <div className="h-3 w-full rounded-full bg-[var(--surface)] overflow-hidden flex border border-[var(--border-subtle)]">
              <div
                style={{ width: `${Math.min(100, twoCompModel.bodyFatPct)}%` }}
                className="bg-amber-500 h-full transition-all"
                title={`Massa Gorda: ${twoCompModel.bodyFatPct}%`}
              />
              <div
                style={{ width: `${Math.min(100, twoCompModel.leanMassPct)}%` }}
                className="bg-emerald-500 h-full transition-all"
                title={`Massa Livre: ${twoCompModel.leanMassPct}%`}
              />
            </div>
            <div className="flex justify-between text-[11px] font-bold">
              <span className="text-amber-600 dark:text-amber-400">
                Gordura: {twoCompModel.bodyFatKg ?? "—"} kg ({twoCompModel.bodyFatPct}%)
              </span>
              <span className="text-emerald-600 dark:text-emerald-400">
                Livre de Gordura: {twoCompModel.leanMassKg ?? "—"} kg ({twoCompModel.leanMassPct}%)
              </span>
            </div>
          </div>
        )}

        {/* Inconsistency Warning (WITHOUT silent correction) */}
        {twoCompModel.isInconsistent && (
          <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>Aviso de Inconsistência nos Dados Digitados</span>
            </div>
            <p>
              {twoCompModel.inconsistencyDetails}
            </p>
            <p className="text-[10px] opacity-80">
              * O Trevo One não altera nem corrige silenciosamente os valores digitados pelo profissional. Verifique os valores de peso, gordura e massa livre se desejar ajustar.
            </p>
          </div>
        )}
      </div>

      {/* Secondary Parameters (Water, Bone, Visceral Fat, Metadata) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-[var(--border-subtle)]">
        <div>
          <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block">
            Água Corporal Total
          </span>
          <span className="text-sm font-extrabold text-[var(--text-primary)] tabular-nums block">
            {bodyWaterKg != null ? `${bodyWaterKg} kg` : bodyWaterPct != null ? `${bodyWaterPct}%` : "—"}
          </span>
          {bodyWaterKg != null && bodyWaterPct != null && (
            <span className="text-[10px] text-[var(--text-tertiary)] block">
              {bodyWaterPct}% do peso
            </span>
          )}
        </div>

        <div>
          <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block">
            Massa Óssea
          </span>
          <span className="text-sm font-extrabold text-[var(--text-primary)] tabular-nums block">
            {boneMassValue != null ? `${boneMassValue} ${boneMassUnit}` : "—"}
          </span>
          <span className="text-[10px] text-[var(--text-tertiary)] block">
            {entry.boneMassMethod || "Estimativa clínica"}
          </span>
        </div>

        <div>
          <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block">
            Equipamento / Método
          </span>
          <span className="text-xs font-bold text-[var(--text-primary)] block truncate" title={equipment || "Não especificado"}>
            {equipment || "Não especificado"}
          </span>
          {protocol && (
            <span className="text-[10px] text-[var(--text-tertiary)] block truncate">
              {protocol}
            </span>
          )}
        </div>

        <div>
          <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block">
            Origem do Registro
          </span>
          <span className="text-xs font-bold text-[var(--text-primary)] block">
            {origin === "REPORTED" ? "Relatado pelo Paciente" : "Gravado pelo Profissional"}
          </span>
          <span className="text-[10px] text-[var(--text-tertiary)] block">
            Auditoria clínica ativa
          </span>
        </div>
      </div>
    </div>
  );
}
