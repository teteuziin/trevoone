"use client";

import { useState } from "react";
import type { ItemSubstitutionDto } from "@/lib/nutrition-v2/plan-repository";

interface NutritionSubstitutionEditorProps {
  substitution: ItemSubstitutionDto;
  onUpdate: (data: { prescribedQuantity?: number | null; prescribedUnitCode?: string | null; notes?: string | null }) => Promise<void>;
  onRemove: () => Promise<void>;
  onMoveUp?: () => Promise<void>;
  onMoveDown?: () => Promise<void>;
  isFirst: boolean;
  isLast: boolean;
}

export function NutritionSubstitutionEditor({
  substitution,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: NutritionSubstitutionEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [quantity, setQuantity] = useState(String(substitution.prescribedQuantity || ""));
  const [notes, setNotes] = useState(substitution.notes || "");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    const numQty = quantity ? parseFloat(quantity.replace(",", ".")) : null;
    await onUpdate({
      prescribedQuantity: numQty && numQty > 0 ? numQty : null,
      notes: notes.trim() || null,
    });
    setIsSaving(false);
    setIsEditing(false);
  };

  return (
    <div className="pl-6 pr-3 py-2.5 rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-secondary)]/30 hover:border-[var(--brand-primary)]/40 transition-colors">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 shrink-0 uppercase tracking-wide">
            OU
          </span>
          <span className="text-xs font-medium text-[var(--text-primary)] truncate">
            {substitution.foodNameSnapshot}
          </span>
          {substitution.prescribedQuantity != null && (
            <span className="text-xs text-[var(--text-secondary)] shrink-0 font-medium">
              · {substitution.prescribedQuantity} {substitution.prescribedUnitLabel || substitution.prescribedUnitCode || ""}
            </span>
          )}
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1 shrink-0">
          {!isEditing && (
            <>
              {onMoveUp && !isFirst && (
                <button
                  type="button"
                  title="Mover para cima"
                  onClick={() => onMoveUp()}
                  className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded hover:bg-[var(--surface-secondary)]"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
                  </svg>
                </button>
              )}
              {onMoveDown && !isLast && (
                <button
                  type="button"
                  title="Mover para baixo"
                  onClick={() => onMoveDown()}
                  className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded hover:bg-[var(--surface-secondary)]"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              )}
              <button
                type="button"
                title="Editar quantidade"
                onClick={() => setIsEditing(true)}
                className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded hover:bg-[var(--surface-secondary)]"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
              <button
                type="button"
                title="Remover substituição"
                onClick={onRemove}
                className="p-1 text-red-500/80 hover:text-red-600 rounded hover:bg-red-500/10"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Inline edit mode */}
      {isEditing && (
        <div className="mt-2.5 pt-2.5 border-t border-[var(--border)] space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-0.5">
                Quantidade:
              </label>
              <input
                type="number"
                step="any"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[var(--border)] bg-[var(--surface-primary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-primary)]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-0.5">
                Observações:
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: cru, assado..."
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[var(--border)] bg-[var(--surface-primary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-primary)]"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-2.5 py-1 text-[11px] rounded-lg border border-[var(--border)] text-[var(--text-secondary)]"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSave}
              className="px-2.5 py-1 text-[11px] rounded-lg bg-[var(--brand-primary)] text-white font-medium hover:opacity-90"
            >
              {isSaving ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </div>
      )}

      {/* Macros / Notes row */}
      {!isEditing && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-[var(--text-muted)] mt-1">
          {substitution.caloriesKcalSnapshot != null && (
            <span className="font-semibold text-amber-600 dark:text-amber-400">
              {substitution.caloriesKcalSnapshot} kcal
            </span>
          )}
          {substitution.proteinGSnapshot != null && <span>P: {substitution.proteinGSnapshot}g</span>}
          {substitution.carbohydrateGSnapshot != null && <span>C: {substitution.carbohydrateGSnapshot}g</span>}
          {substitution.fatGSnapshot != null && <span>G: {substitution.fatGSnapshot}g</span>}
          {substitution.notes && <span className="italic">· {substitution.notes}</span>}
        </div>
      )}
    </div>
  );
}
