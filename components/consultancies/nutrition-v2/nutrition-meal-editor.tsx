"use client";

import { useState } from "react";
import type { MealWithItemsDto } from "@/lib/nutrition-v2/plan-repository";
import { NutritionItemEditor } from "./nutrition-item-editor";
import { NutritionFoodPicker, type FoodSelectionResult } from "./nutrition-food-picker";
import { NutritionMicronutrientsPanel } from "./nutrition-micronutrients-panel";

interface NutritionMealEditorProps {
  slug: string;
  meal: MealWithItemsDto;
  readOnly?: boolean;
  isFirst: boolean;
  isLast: boolean;
  onUpdateMeal: (data: { title?: string; scheduledTime?: string | null; notes?: string | null }) => Promise<void>;
  onRemoveMeal: () => Promise<void>;
  onMoveUp?: () => Promise<void>;
  onMoveDown?: () => Promise<void>;
  onAddItem: (payload: FoodSelectionResult) => Promise<void>;
  onUpdateItem: (itemPublicId: string, data: { prescribedQuantity?: number | null; notes?: string | null }) => Promise<void>;
  onRemoveItem: (itemPublicId: string) => Promise<void>;
  onReorderItems: (orderedItemPublicIds: string[]) => Promise<void>;
  onAddSubstitution: (itemPublicId: string, payload: FoodSelectionResult) => Promise<void>;
  onUpdateSubstitution: (subPublicId: string, data: { prescribedQuantity?: number | null; notes?: string | null }) => Promise<void>;
  onRemoveSubstitution: (subPublicId: string) => Promise<void>;
  onReorderSubstitutions: (itemPublicId: string, orderedSubPublicIds: string[]) => Promise<void>;
}

export function NutritionMealEditor({
  slug,
  meal,
  readOnly = false,
  isFirst,
  isLast,
  onUpdateMeal,
  onRemoveMeal,
  onMoveUp,
  onMoveDown,
  onAddItem,
  onUpdateItem,
  onRemoveItem,
  onReorderItems,
  onAddSubstitution,
  onUpdateSubstitution,
  onRemoveSubstitution,
  onReorderSubstitutions,
}: NutritionMealEditorProps) {
  const [isEditingMeal, setIsEditingMeal] = useState(false);
  const [title, setTitle] = useState(meal.title);
  const [scheduledTime, setScheduledTime] = useState(meal.scheduledTime || "");
  const [notes, setNotes] = useState(meal.notes || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleSaveMeal = async () => {
    if (!title.trim()) {
      alert("O nome da refeição é obrigatório.");
      return;
    }
    setIsSaving(true);
    await onUpdateMeal({
      title: title.trim(),
      scheduledTime: scheduledTime.trim() || null,
      notes: notes.trim() || null,
    });
    setIsSaving(false);
    setIsEditingMeal(false);
  };

  const handleMoveItem = async (index: number, direction: "UP" | "DOWN") => {
    const items = [...meal.items];
    const targetIdx = direction === "UP" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= items.length) return;

    const temp = items[index];
    items[index] = items[targetIdx];
    items[targetIdx] = temp;

    await onReorderItems(items.map((it) => it.publicId));
  };

  return (
    <div className="bg-[var(--surface-primary)] border border-[var(--border)] rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
      {/* Meal Header */}
      <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] pb-3.5">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h3 className="font-bold text-base text-[var(--text-primary)] leading-tight">
              {meal.title}
            </h3>
            {meal.scheduledTime && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--surface-secondary)] text-[var(--text-secondary)] border border-[var(--border)]">
                <svg className="w-3 h-3 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{meal.scheduledTime}</span>
              </span>
            )}
          </div>
          {meal.notes && (
            <p className="text-xs text-[var(--text-muted)]">{meal.notes}</p>
          )}

          {/* Meal macro totals badge */}
          <div className="flex items-center gap-2 pt-1 flex-wrap text-xs">
            <span className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
              Total da refeição:
            </span>
            <span className="font-bold text-[var(--brand)] bg-[var(--brand)]/10 px-2.5 py-0.5 rounded-full border border-[var(--brand)]/20">
              {meal.mealTotals.caloriesKcal} kcal
              {!meal.mealTotals.empty && meal.mealTotals.details?.calories?.hasUnknown && (
                <span className="text-amber-500 font-bold ml-0.5" title={`${meal.mealTotals.details.calories.knownItemCount} de ${meal.mealTotals.details.calories.totalItemCount} alimentos com dado conhecido`}>*</span>
              )}
            </span>
            <span className="font-medium text-[var(--text-secondary)]">
              P <strong className="text-[var(--text-primary)] font-semibold">{meal.mealTotals.proteinG} g</strong>
              {!meal.mealTotals.empty && meal.mealTotals.details?.protein?.hasUnknown && (
                <span className="text-amber-500 font-bold ml-0.5" title={`${meal.mealTotals.details.protein.knownItemCount} de ${meal.mealTotals.details.protein.totalItemCount} alimentos com dado conhecido`}>*</span>
              )}
            </span>
            <span className="text-[var(--text-tertiary)]">·</span>
            <span className="font-medium text-[var(--text-secondary)]">
              C <strong className="text-[var(--text-primary)] font-semibold">{meal.mealTotals.carbohydrateG} g</strong>
              {!meal.mealTotals.empty && meal.mealTotals.details?.carbohydrate?.hasUnknown && (
                <span className="text-amber-500 font-bold ml-0.5" title={`${meal.mealTotals.details.carbohydrate.knownItemCount} de ${meal.mealTotals.details.carbohydrate.totalItemCount} alimentos com dado conhecido`}>*</span>
              )}
            </span>
            <span className="text-[var(--text-tertiary)]">·</span>
            <span className="font-medium text-[var(--text-secondary)]">
              G <strong className="text-[var(--text-primary)] font-semibold">{meal.mealTotals.fatG} g</strong>
              {!meal.mealTotals.empty && meal.mealTotals.details?.fat?.hasUnknown && (
                <span className="text-amber-500 font-bold ml-0.5" title={`${meal.mealTotals.details.fat.knownItemCount} de ${meal.mealTotals.details.fat.totalItemCount} alimentos com dado conhecido`}>*</span>
              )}
            </span>
            {!meal.mealTotals.empty && meal.mealTotals.hasIncompleteData && (
              <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                * Contém dados incompletos
              </span>
            )}
          </div>
        </div>

        {/* Meal Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            title={isCollapsed ? "Expandir refeição" : "Recolher refeição"}
            aria-expanded={!isCollapsed}
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 sm:p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-xl hover:bg-[var(--surface-secondary)] transition-colors min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 flex items-center justify-center cursor-pointer"
          >
            <svg className={`w-4 h-4 transition-transform duration-200 ${isCollapsed ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
            </svg>
          </button>

          {!readOnly && (
            <>
              {onMoveUp && !isFirst && (
                <button
                  type="button"
                  title="Mover refeição para cima"
                  onClick={() => onMoveUp()}
                  className="p-2 sm:p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-xl hover:bg-[var(--surface-secondary)] min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 flex items-center justify-center cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
                  </svg>
                </button>
              )}
              {onMoveDown && !isLast && (
                <button
                  type="button"
                  title="Mover refeição para baixo"
                  onClick={() => onMoveDown()}
                  className="p-2 sm:p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-xl hover:bg-[var(--surface-secondary)] min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 flex items-center justify-center cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              )}
              <button
                type="button"
                title="Editar refeição"
                onClick={() => setIsEditingMeal(true)}
                className="p-2 sm:p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-xl hover:bg-[var(--surface-secondary)] min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 flex items-center justify-center cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
              <button
                type="button"
                title="Remover refeição"
                onClick={() => {
                  if (confirm(`Remover a refeição "${meal.title}" e todos os seus itens?`)) {
                    onRemoveMeal();
                  }
                }}
                className="p-2 sm:p-1.5 text-red-500/80 hover:text-red-600 rounded-xl hover:bg-red-500/10 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 flex items-center justify-center cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </>
          )}
        </div>
      </div>

      {isCollapsed ? (
        <div
          onClick={() => setIsCollapsed(false)}
          className="p-3.5 bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-xs text-[var(--text-secondary)] rounded-xl flex items-center justify-between cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-2 truncate min-w-0">
            <span className="font-semibold text-[var(--text-primary)] shrink-0">
              {meal.items.length} {meal.items.length === 1 ? "alimento" : "alimentos"}
            </span>
            {meal.items.length > 0 && (
              <span className="truncate text-[var(--text-tertiary)]">
                · {meal.items.map((it) => it.foodNameSnapshot || "Alimento").join(", ")}
              </span>
            )}
          </div>
          <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 shrink-0 ml-2">
            Expandir refeição ↓
          </span>
        </div>
      ) : (
        <>
          {/* Inline meal edit form */}
      {isEditingMeal && (
        <div className="p-3.5 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)] space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">Nome da refeição: *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-[var(--border)] bg-[var(--surface-primary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-primary)]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">Horário (opcional):</label>
              <input
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-[var(--border)] bg-[var(--surface-primary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-primary)]"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">Observações da refeição (opcional):</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Tomar 30 min antes do treino..."
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-[var(--border)] bg-[var(--surface-primary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-primary)]"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsEditingMeal(false)}
              className="px-3 py-1.5 text-xs rounded-lg border border-[var(--border)] text-[var(--text-secondary)]"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSaveMeal}
              className="px-3 py-1.5 text-xs rounded-lg bg-[var(--brand-primary)] text-white font-medium hover:opacity-90"
            >
              {isSaving ? "Salvando..." : "Salvar Refeição"}
            </button>
          </div>
        </div>
      )}

      {/* Items List */}
      <div className="space-y-2.5">
        {meal.items.length === 0 ? (
          <div className="py-6 px-4 text-center rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-secondary)]/30">
            <p className="text-xs text-[var(--text-muted)]">Nenhum alimento adicionado nesta refeição.</p>
          </div>
        ) : (
          meal.items.map((item, idx) => (
            <NutritionItemEditor
              key={item.publicId}
              slug={slug}
              item={item}
              readOnly={readOnly}
              isFirst={idx === 0}
              isLast={idx === meal.items.length - 1}
              onUpdateItem={(data) => onUpdateItem(item.publicId, data)}
              onRemoveItem={() => onRemoveItem(item.publicId)}
              onMoveUp={() => handleMoveItem(idx, "UP")}
              onMoveDown={() => handleMoveItem(idx, "DOWN")}
              onAddSubstitution={(payload) => onAddSubstitution(item.publicId, payload)}
              onUpdateSubstitution={onUpdateSubstitution}
              onRemoveSubstitution={onRemoveSubstitution}
              onReorderSubstitutions={(orderedSubs) => onReorderSubstitutions(item.publicId, orderedSubs)}
            />
          ))
        )}
      </div>

      {/* Add Item Action */}
      {!readOnly && (
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setIsPickerOpen(true)}
            className="w-full py-3 px-4 rounded-xl border border-dashed border-[var(--border)] hover:border-[var(--brand-primary)] bg-[var(--surface-secondary)]/40 hover:bg-[var(--brand-primary)]/5 text-xs font-semibold text-[var(--brand-primary)] transition-colors flex items-center justify-center gap-2 min-h-[44px] cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span>Adicionar Alimento a esta Refeição</span>
          </button>
        </div>
      )}

      {/* Meal Micronutrients Breakdown */}
      {meal.micronutrientTotals && meal.items.length > 0 && (
        <div className="pt-1">
          <NutritionMicronutrientsPanel
            totals={meal.micronutrientTotals}
            title={`Micronutrientes — ${meal.title}`}
            defaultCollapsed={true}
          />
        </div>
      )}

      {/* Food Picker Modal */}
      <NutritionFoodPicker
        slug={slug}
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        onSelect={async (res) => {
          await onAddItem(res);
        }}
        title={`Adicionar Alimento em "${meal.title}"`}
      />
        </>
      )}
    </div>
  );
}
