"use client";

import React, { useState } from "react";
import type { MealItemWithSubstitutionsDto, ItemSubstitutionDto, UpdateSubstitutionInput } from "@/lib/nutrition-v2/plan-repository";
import { EQUIVALENT_CRITERIA_LABELS, type EquivalentCriterion } from "@/lib/nutrition-v2/equivalents";

interface NutritionSubstitutionCompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  primaryItem: MealItemWithSubstitutionsDto;
  substitution: ItemSubstitutionDto;
  onUpdateSubstitution?: (subPublicId: string, data: UpdateSubstitutionInput) => Promise<void>;
}

export function NutritionSubstitutionCompareModal({
  isOpen,
  onClose,
  primaryItem,
  substitution,
  onUpdateSubstitution,
}: NutritionSubstitutionCompareModalProps) {
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const primKcal = primaryItem.caloriesKcalSnapshot ?? 0;
  const primP = primaryItem.proteinGSnapshot ?? 0;
  const primC = primaryItem.carbohydrateGSnapshot ?? 0;
  const primG = primaryItem.fatGSnapshot ?? 0;

  const subKcal = substitution.caloriesKcalSnapshot ?? 0;
  const subP = substitution.proteinGSnapshot ?? 0;
  const subC = substitution.carbohydrateGSnapshot ?? 0;
  const subG = substitution.fatGSnapshot ?? 0;

  const diffKcal = Math.round((subKcal - primKcal) * 10) / 10;
  const diffP = Math.round((subP - primP) * 10) / 10;
  const diffC = Math.round((subC - primC) * 10) / 10;
  const diffG = Math.round((subG - primG) * 10) / 10;

  const formatDelta = (val: number, unit: string) => {
    if (val === 0) return `0 ${unit}`;
    const sign = val > 0 ? "+" : "";
    return `${sign}${val} ${unit}`;
  };

  const getDeltaBadgeClass = (val: number, threshold: number) => {
    const abs = Math.abs(val);
    if (abs <= threshold) return "text-emerald-600 dark:text-emerald-400 font-bold";
    if (abs <= threshold * 2.5) return "text-amber-600 dark:text-amber-400 font-bold";
    return "text-rose-600 dark:text-rose-400 font-bold";
  };

  const handleConfirmVerification = async () => {
    if (!onUpdateSubstitution) {
      onClose();
      return;
    }
    setIsSaving(true);
    try {
      await onUpdateSubstitution(substitution.publicId, {
        prescribedQuantity: substitution.prescribedQuantity,
        portionPublicId: null,
        prescribedUnitCode: substitution.prescribedUnitCode,
        prescribedUnitLabel: substitution.prescribedUnitLabel,
        notes: substitution.notes,
        equivalenceCriterion: substitution.equivalenceCriterion || "CALORIES",
      });
      onClose();
    } catch {
      alert("Erro ao confirmar equivalência.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-[var(--surface-primary)] border border-[var(--border)] rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-[var(--text-primary)]">
              Comparar Alimento vs Substituição
            </h3>
            <p className="text-xs text-[var(--text-secondary)]">
              Critério: {EQUIVALENT_CRITERIA_LABELS[substitution.equivalenceCriterion as EquivalentCriterion] || "Manual"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-lg hover:bg-[var(--surface-secondary)] cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Comparison Content */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">
          {/* Side by side comparison cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Primary Food */}
            <div className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)]/50 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] block">
                Alimento Principal
              </span>
              <h4 className="text-xs sm:text-sm font-bold text-[var(--text-primary)] line-clamp-2">
                {primaryItem.foodNameSnapshot}
              </h4>
              <div className="text-xs text-[var(--text-secondary)] font-medium">
                {primaryItem.prescribedQuantity} {primaryItem.prescribedUnitLabel || primaryItem.prescribedUnitCode || "g"}
              </div>
              <div className="pt-2 border-t border-[var(--border-subtle)] space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">Energia:</span>
                  <span className="font-bold text-[var(--brand)]">{primKcal} kcal</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">Proteínas:</span>
                  <span className="font-semibold">{primP}g</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">Carboidratos:</span>
                  <span className="font-semibold">{primC}g</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">Gorduras:</span>
                  <span className="font-semibold">{primG}g</span>
                </div>
              </div>
            </div>

            {/* Substitution Food */}
            <div className="p-3.5 rounded-xl border-2 border-amber-500/30 bg-amber-500/5 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 block">
                Alternativa (OU)
              </span>
              <h4 className="text-xs sm:text-sm font-bold text-[var(--text-primary)] line-clamp-2">
                {substitution.foodNameSnapshot}
              </h4>
              <div className="text-xs text-[var(--text-secondary)] font-medium">
                {substitution.prescribedQuantity} {substitution.prescribedUnitLabel || substitution.prescribedUnitCode || "g"}
              </div>
              <div className="pt-2 border-t border-amber-500/20 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">Energia:</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">{subKcal} kcal</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">Proteínas:</span>
                  <span className="font-semibold">{subP}g</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">Carboidratos:</span>
                  <span className="font-semibold">{subC}g</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">Gorduras:</span>
                  <span className="font-semibold">{subG}g</span>
                </div>
              </div>
            </div>
          </div>

          {/* Difference / Delta Analysis */}
          <div className="p-3.5 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)] space-y-2">
            <h5 className="text-xs font-bold text-[var(--text-primary)]">
              Variação Nutricional (Deltas)
            </h5>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
              <div className="p-2 rounded-lg bg-[var(--surface-primary)] border border-[var(--border-subtle)]">
                <span className="text-[10px] text-[var(--text-tertiary)] block">Δ Calorias</span>
                <span className={getDeltaBadgeClass(diffKcal, 25)}>
                  {formatDelta(diffKcal, "kcal")}
                </span>
              </div>
              <div className="p-2 rounded-lg bg-[var(--surface-primary)] border border-[var(--border-subtle)]">
                <span className="text-[10px] text-[var(--text-tertiary)] block">Δ Proteína</span>
                <span className={getDeltaBadgeClass(diffP, 2)}>
                  {formatDelta(diffP, "g")}
                </span>
              </div>
              <div className="p-2 rounded-lg bg-[var(--surface-primary)] border border-[var(--border-subtle)]">
                <span className="text-[10px] text-[var(--text-tertiary)] block">Δ Carboidrato</span>
                <span className={getDeltaBadgeClass(diffC, 4)}>
                  {formatDelta(diffC, "g")}
                </span>
              </div>
              <div className="p-2 rounded-lg bg-[var(--surface-primary)] border border-[var(--border-subtle)]">
                <span className="text-[10px] text-[var(--text-tertiary)] block">Δ Gordura</span>
                <span className={getDeltaBadgeClass(diffG, 2)}>
                  {formatDelta(diffG, "g")}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--border)] bg-[var(--surface-secondary)]/50 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] cursor-pointer"
          >
            Fechar
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={handleConfirmVerification}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-[var(--brand)] text-white hover:opacity-90 shadow-2xs cursor-pointer"
          >
            {isSaving ? "Salvando..." : "Confirmar Equivalência"}
          </button>
        </div>
      </div>
    </div>
  );
}
