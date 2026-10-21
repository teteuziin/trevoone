"use client";

import React, { useState, useEffect, useRef } from "react";
import type {
  MealWithItemsDto,
  UpdateMealItemInput,
  AddSubstitutionInput,
  UpdateSubstitutionInput,
} from "@/lib/nutrition-v2/plan-repository";
import { NutritionItemEditor } from "./nutrition-item-editor";
import { NutritionFoodPicker, type FoodSelectionResult } from "./nutrition-food-picker";
import { NutritionMealInlineSearch } from "./nutrition-meal-inline-search";
import { NutritionMicronutrientsPanel } from "./nutrition-micronutrients-panel";

interface NutritionMealEditorProps {
  slug: string;
  meal: MealWithItemsDto;
  readOnly?: boolean;
  onLiveQuantityChange?: (mealPublicId: string, itemPublicId: string, quantity: number | null) => void;
  isFirst: boolean;
  isLast: boolean;
  onUpdateMeal: (data: { title?: string; scheduledTime?: string | null; notes?: string | null }) => Promise<void>;
  onRemoveMeal: () => Promise<void>;
  onDuplicateMeal?: () => Promise<void>;
  onMoveUp?: () => Promise<void>;
  onMoveDown?: () => Promise<void>;
  onAddItem: (payload: FoodSelectionResult) => Promise<void>;
  onUpdateItem: (itemPublicId: string, data: UpdateMealItemInput) => Promise<void>;
  onRemoveItem: (itemPublicId: string) => Promise<void>;
  onReorderItems: (orderedItemPublicIds: string[]) => Promise<void>;
  onAddSubstitution: (itemPublicId: string, payload: AddSubstitutionInput) => Promise<void>;
  onUpdateSubstitution: (subPublicId: string, data: UpdateSubstitutionInput) => Promise<void>;
  onRemoveSubstitution: (subPublicId: string) => Promise<void>;
  onReorderSubstitutions: (itemPublicId: string, orderedSubPublicIds: string[]) => Promise<void>;
  forceCollapsed?: boolean;
}

export function NutritionMealEditor({
  slug,
  meal,
  readOnly = false,
  onLiveQuantityChange,
  isFirst,
  isLast,
  onUpdateMeal,
  onRemoveMeal,
  onDuplicateMeal,
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
  forceCollapsed,
}: NutritionMealEditorProps) {
  const [isEditingMeal, setIsEditingMeal] = useState(false);
  const [title, setTitle] = useState(meal.title);
  const [scheduledTime, setScheduledTime] = useState(meal.scheduledTime || "");
  const [notes, setNotes] = useState(meal.notes || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isInlineSearchOpen, setIsInlineSearchOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [prevForceCollapsed, setPrevForceCollapsed] = useState(forceCollapsed);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);

  // Sync forced collapse state from parent (Expandir todas / Recolher todas)
  if (forceCollapsed !== prevForceCollapsed) {
    setPrevForceCollapsed(forceCollapsed);
    if (forceCollapsed !== undefined) {
      setIsCollapsed(forceCollapsed);
    }
  }

  // Click away listener for meal menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMenuOpen]);

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
    <div
      id={`meal-${meal.publicId}`}
      className="bg-[var(--surface-primary)] border border-[var(--border)] rounded-2xl p-3 sm:p-4 shadow-2xs space-y-3 w-full max-w-full min-w-0 transition-all hover:border-[var(--brand)]/30"
    >
      {/* ========================================================================= */}
      {/* MEAL HEADER: Title, Time, Subtotal, Collapse Chevron, Menu ⋮              */}
      {/* ========================================================================= */}
      <div className="flex items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-2.5 w-full min-w-0">
        {/* Left: Title + Time Badge + Subtotal summary */}
        <div className="flex items-center gap-2 flex-wrap min-w-0 flex-1">
          <h3 className="font-extrabold text-sm sm:text-base tracking-wide text-[var(--text-primary)] uppercase truncate">
            {meal.title}
          </h3>

          {meal.scheduledTime && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[var(--surface-secondary)] text-[var(--text-secondary)] border border-[var(--border)] shrink-0">
              <svg className="w-3 h-3 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{meal.scheduledTime}</span>
            </span>
          )}

          {/* Subtotal badge directly in header for quick glancing */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-[var(--text-secondary)] font-mono ml-1">
            <span className="font-bold text-[var(--brand)]">
              {meal.mealTotals.caloriesKcal} kcal
            </span>
            {meal.mealTotals.hasIncompleteData && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                Subtotal parcial
              </span>
            )}
            <span className="text-[var(--text-tertiary)]">·</span>
            <span>
              P {meal.mealTotals.proteinG}g
              {meal.mealTotals.missingProteinCount > 0 && <span className="text-amber-500 font-bold ml-0.5">*</span>}
            </span>
            <span className="text-[var(--text-tertiary)]">·</span>
            <span>
              C {meal.mealTotals.carbohydrateG}g
              {meal.mealTotals.missingCarbohydrateCount > 0 && <span className="text-amber-500 font-bold ml-0.5">*</span>}
            </span>
            <span className="text-[var(--text-tertiary)]">·</span>
            <span>
              G {meal.mealTotals.fatG}g
              {meal.mealTotals.missingFatCount > 0 && <span className="text-amber-500 font-bold ml-0.5">*</span>}
            </span>
          </div>
          {meal.mealTotals.hasIncompleteData && (
            <span className="sm:hidden inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
              Subtotal parcial
            </span>
          )}
        </div>

        {/* Right: Collapse toggle + Action menu ⋮ */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Collapse / Expand Toggle */}
          <button
            type="button"
            title={isCollapsed ? "Expandir refeição" : "Recolher refeição"}
            aria-expanded={!isCollapsed}
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-lg hover:bg-[var(--surface-secondary)] transition-colors cursor-pointer"
          >
            <svg
              className={`w-4 h-4 transition-transform duration-200 ${isCollapsed ? "-rotate-90" : "rotate-0"}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Meal Action Menu ⋮ */}
          {!readOnly && (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-lg hover:bg-[var(--surface-secondary)] cursor-pointer"
                title="Opções da refeição"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </button>

              {/* Dropdown Menu */}
              {isMenuOpen && (
                <div className="absolute right-0 top-full mt-1 w-52 rounded-xl bg-[var(--surface-primary)] border border-[var(--border)] shadow-xl py-1 z-30 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      setIsEditingMeal(true);
                    }}
                    className="w-full text-left px-3 py-2 text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] flex items-center gap-2 cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5 text-[var(--text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    <span>Editar nome e horário</span>
                  </button>

                  {onDuplicateMeal && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onDuplicateMeal();
                      }}
                      className="w-full text-left px-3 py-2 text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] flex items-center gap-2 cursor-pointer"
                    >
                      <svg className="w-3.5 h-3.5 text-[var(--brand)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                      </svg>
                      <span>Duplicar refeição</span>
                    </button>
                  )}

                  {onMoveUp && !isFirst && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onMoveUp();
                      }}
                      className="w-full text-left px-3 py-2 text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] flex items-center gap-2 cursor-pointer"
                    >
                      <svg className="w-3.5 h-3.5 text-[var(--text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
                      </svg>
                      <span>Mover para cima</span>
                    </button>
                  )}

                  {onMoveDown && !isLast && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onMoveDown();
                      }}
                      className="w-full text-left px-3 py-2 text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] flex items-center gap-2 cursor-pointer"
                    >
                      <svg className="w-3.5 h-3.5 text-[var(--text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                      <span>Mover para baixo</span>
                    </button>
                  )}

                  <div className="border-t border-[var(--border-subtle)] my-1" />

                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      if (confirm(`Remover a refeição "${meal.title}" e todos os seus itens?`)) {
                        onRemoveMeal();
                      }
                    }}
                    className="w-full text-left px-3 py-2 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 flex items-center gap-2 cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span>Excluir refeição</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Meal Notes (if set) */}
      {meal.notes && !isEditingMeal && (
        <p className="text-xs text-[var(--text-muted)] italic px-1 -mt-1">{meal.notes}</p>
      )}

      {/* Collapsed State Summary Bar */}
      {isCollapsed ? (
        <div
          onClick={() => setIsCollapsed(false)}
          className="p-2.5 bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-xs text-[var(--text-secondary)] rounded-xl flex items-center justify-between gap-2 cursor-pointer transition-colors w-full min-w-0"
        >
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap min-w-0 flex-1">
            <span className="font-semibold text-[var(--text-primary)] shrink-0">
              {meal.items.length} {meal.items.length === 1 ? "alimento" : "alimentos"}
            </span>
            <span className="text-[var(--text-tertiary)]">·</span>
            <span className="font-bold text-[var(--brand)] shrink-0">
              {meal.mealTotals.caloriesKcal} kcal
            </span>
            {meal.mealTotals.hasIncompleteData && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 shrink-0">
                Subtotal parcial
              </span>
            )}
            <span className="text-[var(--text-tertiary)]">·</span>
            <span className="text-[var(--text-muted)] text-[11px]">
              P {meal.mealTotals.proteinG}g • C {meal.mealTotals.carbohydrateG}g • G {meal.mealTotals.fatG}g
            </span>
          </div>
          <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 shrink-0 ml-1">
            Expandir ↓
          </span>
        </div>
      ) : (
        <>
          {/* Inline Meal Edit Form */}
          {isEditingMeal && (
            <div className="p-3.5 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)] space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    Nome da refeição: *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-[var(--border)] bg-[var(--surface-primary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    Horário (opcional):
                  </label>
                  <input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-[var(--border)] bg-[var(--surface-primary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Observações da refeição (opcional):
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: Tomar 30 min antes do treino..."
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-[var(--border)] bg-[var(--surface-primary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)]"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsEditingMeal(false)}
                  className="px-3 py-1.5 text-xs rounded-lg border border-[var(--border)] text-[var(--text-secondary)] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={handleSaveMeal}
                  className="px-3 py-1.5 text-xs rounded-lg bg-[var(--brand)] text-white font-medium hover:opacity-90 cursor-pointer"
                >
                  {isSaving ? "Salvando..." : "Salvar Refeição"}
                </button>
              </div>
            </div>
          )}

          {/* Items List */}
          <div className="space-y-1.5">
            {meal.items.length === 0 ? (
              <div className="py-4 px-3 text-center rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-secondary)]/20">
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
                  onLiveQuantityChange={(itemPublicId, qty) => onLiveQuantityChange?.(meal.publicId, itemPublicId, qty)}
                  onUpdateItem={(data) => onUpdateItem(item.publicId, data)}
                  onRemoveItem={() => onRemoveItem(item.publicId)}
                  onMoveUp={() => handleMoveItem(idx, "UP")}
                  onMoveDown={() => handleMoveItem(idx, "DOWN")}
                  onAddItemToMeal={onAddItem}
                  onAddSubstitution={(payload) => onAddSubstitution(item.publicId, payload)}
                  onUpdateSubstitution={onUpdateSubstitution}
                  onRemoveSubstitution={onRemoveSubstitution}
                  onReorderSubstitutions={(orderedSubs) => onReorderSubstitutions(item.publicId, orderedSubs)}
                />
              ))
            )}
          </div>

          {/* Meal Totals Summary Footer */}
          <div className="border-t border-[var(--border-subtle)] pt-2.5 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`font-bold text-xs sm:text-sm ${meal.mealTotals.status === "INCOMPLETE" ? "text-amber-600 dark:text-amber-400" : "text-[var(--text-primary)]"}`}>
                  {meal.mealTotals.status === "INCOMPLETE" ? `Subtotal calculado: ${meal.mealTotals.caloriesKcal} kcal` : `Subtotal: ${meal.mealTotals.caloriesKcal} kcal`}
                </span>
                <span className="text-[var(--text-tertiary)]">•</span>
                <span className="text-[var(--text-secondary)]">
                  P <strong className="text-[var(--text-primary)] font-semibold">{meal.mealTotals.proteinG}g</strong>
                  {!meal.mealTotals.empty && meal.mealTotals.missingProteinCount > 0 && (
                    <span className="text-amber-500 font-bold ml-0.5" title={`${meal.mealTotals.missingProteinCount} alimento(s) sem proteína cadastrada`}>*</span>
                  )}
                </span>
                <span className="text-[var(--text-tertiary)]">•</span>
                <span className="text-[var(--text-secondary)]">
                  C <strong className="text-[var(--text-primary)] font-semibold">{meal.mealTotals.carbohydrateG}g</strong>
                  {!meal.mealTotals.empty && meal.mealTotals.missingCarbohydrateCount > 0 && (
                    <span className="text-amber-500 font-bold ml-0.5" title={`${meal.mealTotals.missingCarbohydrateCount} alimento(s) sem carboidrato cadastrado`}>*</span>
                  )}
                </span>
                <span className="text-[var(--text-tertiary)]">•</span>
                <span className="text-[var(--text-secondary)]">
                  G <strong className="text-[var(--text-primary)] font-semibold">{meal.mealTotals.fatG}g</strong>
                  {!meal.mealTotals.empty && meal.mealTotals.missingFatCount > 0 && (
                    <span className="text-amber-500 font-bold ml-0.5" title={`${meal.mealTotals.missingFatCount} alimento(s) sem gordura cadastrada`}>*</span>
                  )}
                </span>
              </div>

              {!meal.mealTotals.empty && meal.mealTotals.status === "INCOMPLETE" && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                  Dados Incompletos ({meal.mealTotals.incompleteItemsCount})
                </span>
              )}
            </div>

            {/* Add Item Actions */}
            {!readOnly && (
              <div className="space-y-2">
                {isInlineSearchOpen ? (
                  <NutritionMealInlineSearch
                    slug={slug}
                    mealTitle={meal.title}
                    onAddItem={onAddItem}
                    onClose={() => setIsInlineSearchOpen(false)}
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsInlineSearchOpen(true)}
                      className="flex-1 py-2 px-3 rounded-xl border border-dashed border-[var(--brand)]/40 hover:border-[var(--brand)] bg-[var(--brand)]/5 hover:bg-[var(--brand)]/10 text-xs font-bold text-[var(--brand)] transition-colors flex items-center justify-center gap-1.5 cursor-pointer min-h-[38px] active:scale-[0.99]"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      <span>+ Adicionar Alimento</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsPickerOpen(true)}
                      className="px-2.5 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-semibold transition-colors cursor-pointer min-h-[38px] shrink-0"
                      title="Abrir busca avançada com tabela em modal"
                    >
                      Modal
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

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
