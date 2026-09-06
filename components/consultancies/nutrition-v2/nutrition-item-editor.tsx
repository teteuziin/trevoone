"use client";

import { useState } from "react";
import type { MealItemWithSubstitutionsDto } from "@/lib/nutrition-v2/plan-repository";
import { NutritionSubstitutionEditor } from "./nutrition-substitution-editor";
import { NutritionFoodPicker, type FoodSelectionResult } from "./nutrition-food-picker";

interface NutritionItemEditorProps {
  slug: string;
  item: MealItemWithSubstitutionsDto;
  readOnly?: boolean;
  onUpdateItem: (data: { prescribedQuantity?: number | null; prescribedUnitCode?: string | null; notes?: string | null }) => Promise<void>;
  onRemoveItem: () => Promise<void>;
  onMoveUp?: () => Promise<void>;
  onMoveDown?: () => Promise<void>;
  isFirst: boolean;
  isLast: boolean;
  onAddSubstitution: (payload: FoodSelectionResult) => Promise<void>;
  onUpdateSubstitution: (subPublicId: string, data: { prescribedQuantity?: number | null; notes?: string | null }) => Promise<void>;
  onRemoveSubstitution: (subPublicId: string) => Promise<void>;
  onReorderSubstitutions: (orderedSubPublicIds: string[]) => Promise<void>;
}

export function NutritionItemEditor({
  slug,
  item,
  readOnly = false,
  onUpdateItem,
  onRemoveItem,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
  onAddSubstitution,
  onUpdateSubstitution,
  onRemoveSubstitution,
  onReorderSubstitutions,
}: NutritionItemEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [quantity, setQuantity] = useState(String(item.prescribedQuantity || ""));
  const [notes, setNotes] = useState(item.notes || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    const numQty = quantity ? parseFloat(quantity.replace(",", ".")) : null;
    await onUpdateItem({
      prescribedQuantity: numQty && numQty > 0 ? numQty : null,
      notes: notes.trim() || null,
    });
    setIsSaving(false);
    setIsEditing(false);
  };

  const handleMoveSub = async (index: number, direction: "UP" | "DOWN") => {
    const subs = [...item.substitutions];
    const targetIdx = direction === "UP" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= subs.length) return;

    const temp = subs[index];
    subs[index] = subs[targetIdx];
    subs[targetIdx] = temp;

    await onReorderSubstitutions(subs.map((s) => s.publicId));
  };

  return (
    <div className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface-primary)] shadow-sm hover:border-[var(--brand-primary)]/40 transition-colors space-y-3">
      {/* Item Header / Overview */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-[var(--text-primary)]">
              {item.foodNameSnapshot}
            </span>
            {item.prescribedQuantity != null && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[var(--surface-secondary)] text-[var(--text-secondary)]">
                {item.prescribedQuantity} {item.prescribedUnitLabel || item.prescribedUnitCode || ""}
              </span>
            )}
            {item.foodScope && (
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                  item.foodScope === "GLOBAL"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300"
                    : "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300"
                }`}
              >
                {item.foodScope === "GLOBAL" ? "Trevo One" : "Minha Consultoria"}
              </span>
            )}
          </div>

          {/* Macros row */}
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-[var(--text-secondary)]">
            <span className="font-semibold text-amber-600 dark:text-amber-400">
              {item.caloriesKcalSnapshot != null ? `${item.caloriesKcalSnapshot} kcal` : "Sem cálculo"}
            </span>
            <span>P: {item.proteinGSnapshot != null ? `${item.proteinGSnapshot}g` : "-"}</span>
            <span>C: {item.carbohydrateGSnapshot != null ? `${item.carbohydrateGSnapshot}g` : "-"}</span>
            <span>G: {item.fatGSnapshot != null ? `${item.fatGSnapshot}g` : "-"}</span>
            {item.notes && <span className="text-[var(--text-muted)] italic">· {item.notes}</span>}
          </div>
        </div>

        {/* Action icons */}
        {!readOnly && (
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
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
                <button
                  type="button"
                  title="Remover item"
                  onClick={onRemoveItem}
                  className="p-1 text-red-500/80 hover:text-red-600 rounded hover:bg-red-500/10"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Inline edit mode */}
      {isEditing && (
        <div className="p-3 rounded-lg bg-[var(--surface-secondary)]/60 border border-[var(--border)] space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                Quantidade prescrita:
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
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                Observações de consumo:
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: sem sal, cozido..."
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[var(--border)] bg-[var(--surface-primary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-primary)]"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-3 py-1 text-xs rounded-lg border border-[var(--border)] text-[var(--text-secondary)]"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSave}
              className="px-3 py-1 text-xs rounded-lg bg-[var(--brand-primary)] text-white font-medium hover:opacity-90"
            >
              {isSaving ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </div>
      )}

      {/* Substitutions Sub-Tree */}
      <div className="space-y-2 pt-1">
        {item.substitutions.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider px-1">
              <span>Opções de Substituição (OU)</span>
              <span>{item.substitutions.length} alternativa{item.substitutions.length > 1 ? "s" : ""}</span>
            </div>
            <div className="space-y-1.5">
              {item.substitutions.map((sub, idx) => (
                <NutritionSubstitutionEditor
                  key={sub.publicId}
                  substitution={sub}
                  readOnly={readOnly}
                  isFirst={idx === 0}
                  isLast={idx === item.substitutions.length - 1}
                  onUpdate={(data) => onUpdateSubstitution(sub.publicId, data)}
                  onRemove={() => onRemoveSubstitution(sub.publicId)}
                  onMoveUp={() => handleMoveSub(idx, "UP")}
                  onMoveDown={() => handleMoveSub(idx, "DOWN")}
                />
              ))}
            </div>
          </div>
        )}

        {/* Add substitution button */}
        {!readOnly && (
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setIsPickerOpen(true)}
              className="text-xs text-[var(--brand-primary)] hover:underline font-medium inline-flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-[var(--brand-primary)]/5"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              <span>Adicionar Substituição</span>
            </button>
          </div>
        )}
      </div>

      {/* Food Picker for Substitutions */}
      <NutritionFoodPicker
        slug={slug}
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        onSelect={async (res) => {
          await onAddSubstitution(res);
        }}
        title={`Adicionar Substituição para "${item.foodNameSnapshot}"`}
      />
    </div>
  );
}
