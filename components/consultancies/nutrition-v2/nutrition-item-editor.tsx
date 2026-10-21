"use client";

import React, { useState, useRef, useEffect } from "react";
import type {
  MealItemWithSubstitutionsDto,
  ItemSubstitutionDto,
  AddSubstitutionInput,
  UpdateSubstitutionInput,
} from "@/lib/nutrition-v2/plan-repository";
import { NutritionSubstitutionEditor } from "./nutrition-substitution-editor";
import { NutritionSubstitutionCompareModal } from "./nutrition-substitution-compare-modal";
import { NutritionFoodPicker } from "./nutrition-food-picker";
import { NutritionEquivalentsModal } from "./nutrition-equivalents-modal";
import type { FoodListItemDto } from "@/lib/nutrition-v2/food-repository";
import { calculateMealMicronutrientTotals } from "@/lib/nutrition-v2/nutrient-calculator";
import { NutritionMicronutrientsPanel } from "./nutrition-micronutrients-panel";

interface NutritionItemEditorProps {
  slug: string;
  item: MealItemWithSubstitutionsDto;
  readOnly?: boolean;
  onLiveQuantityChange?: (itemPublicId: string, quantity: number | null) => void;
  onUpdateItem: (data: {
    foodPublicId?: string;
    portionPublicId?: string | null;
    prescribedQuantity?: number | null;
    prescribedUnitCode?: string | null;
    prescribedUnitLabel?: string | null;
    notes?: string | null;
  }) => Promise<void>;
  onRemoveItem: () => Promise<void>;
  onMoveUp?: () => Promise<void>;
  onMoveDown?: () => Promise<void>;
  isFirst: boolean;
  isLast: boolean;
  onAddSubstitution: (payload: AddSubstitutionInput) => Promise<void>;
  onUpdateSubstitution: (subPublicId: string, data: UpdateSubstitutionInput) => Promise<void>;
  onRemoveSubstitution: (subPublicId: string) => Promise<void>;
  onReorderSubstitutions: (orderedSubPublicIds: string[]) => Promise<void>;
  initialFoodsForEquivalents?: FoodListItemDto[];
}

export function NutritionItemEditor({
  slug,
  item,
  readOnly = false,
  onLiveQuantityChange,
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
  initialFoodsForEquivalents,
}: NutritionItemEditorProps) {
  // Inline quantity input state
  const [localQuantity, setLocalQuantity] = useState(
    item.prescribedQuantity != null ? String(item.prescribedQuantity) : ""
  );
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notes, setNotes] = useState(item.notes || "");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [areSubsExpanded, setAreSubsExpanded] = useState(false);

  // Sync external quantity when item changes outside inline editing using render-phase check
  const [prevItemSnapshot, setPrevItemSnapshot] = useState({
    qty: item.prescribedQuantity,
    notes: item.notes,
  });

  if (prevItemSnapshot.qty !== item.prescribedQuantity || prevItemSnapshot.notes !== item.notes) {
    setPrevItemSnapshot({
      qty: item.prescribedQuantity,
      notes: item.notes,
    });
    setLocalQuantity(item.prescribedQuantity != null ? String(item.prescribedQuantity) : "");
    setNotes(item.notes || "");
  }

  // Modals & Panels
  const [isResolvePickerOpen, setIsResolvePickerOpen] = useState(false);
  const [isEquivalentsOpen, setIsEquivalentsOpen] = useState(false);
  const [substitutionToReview, setSubstitutionToReview] = useState<ItemSubstitutionDto | null>(null);
  const [substitutionToCompare, setSubstitutionToCompare] = useState<ItemSubstitutionDto | null>(null);
  const [showMicro, setShowMicro] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Click away listener for menu
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

  // Dynamic preview calculation when typing quantity
  const parsedLocalQty = localQuantity ? parseFloat(localQuantity.replace(",", ".")) : null;
  const isCustomQtyValid = parsedLocalQty != null && Number.isFinite(parsedLocalQty) && parsedLocalQty > 0;
  const scale = isCustomQtyValid && item.prescribedQuantity && item.prescribedQuantity > 0
    ? parsedLocalQty / item.prescribedQuantity
    : 1;

  const displayKcal = item.caloriesKcalSnapshot != null
    ? Math.round(item.caloriesKcalSnapshot * scale)
    : null;
  const displayP = item.proteinGSnapshot != null
    ? Math.round(item.proteinGSnapshot * scale * 10) / 10
    : null;
  const displayC = item.carbohydrateGSnapshot != null
    ? Math.round(item.carbohydrateGSnapshot * scale * 10) / 10
    : null;
  const displayG = item.fatGSnapshot != null
    ? Math.round(item.fatGSnapshot * scale * 10) / 10
    : null;

  // Portion weight calculation
  const equivGrams = item.portionEquivalentAmount != null && item.portionEquivalentAmount > 0
    ? Math.round((isCustomQtyValid ? parsedLocalQty : (item.prescribedQuantity || 0)) * item.portionEquivalentAmount * 10) / 10
    : null;

  const isMissingPortionConversion = item.foodId != null &&
    item.prescribedUnitCode &&
    !["G", "KG", "ML", "L"].includes(item.prescribedUnitCode.trim().toUpperCase()) &&
    (item.portionEquivalentAmount == null || item.portionEquivalentAmount <= 0) &&
    item.caloriesKcalSnapshot == null;

  // Debounced quantity save + live synchronous propagation
  const handleQuantityChange = (newVal: string) => {
    setLocalQuantity(newVal);
    const parsed = newVal ? parseFloat(newVal.replace(",", ".")) : null;
    const validQty = parsed != null && Number.isFinite(parsed) && parsed > 0 ? parsed : null;

    // Immediately propagate to parent builder for instant meal and day totals
    onLiveQuantityChange?.(item.publicId, validQty);

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    debounceTimerRef.current = setTimeout(async () => {
      if (validQty != null) {
        await onUpdateItem({ prescribedQuantity: validQty });
      }
    }, 600);
  };

  // Save notes
  const handleSaveNotes = async () => {
    await onUpdateItem({ notes: notes.trim() || null });
    setIsEditingNotes(false);
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

  const unverifiedSubsCount = item.substitutions.filter(
    (s) => s.derivedStatus === "UNVERIFIED" || s.derivedStatus === "STALE" || s.foodId == null
  ).length;

  const hasIssues = item.foodId == null ||
    (item.caloriesKcalSnapshot == null && (item.prescribedUnitCode === "PORCAO" || (item.prescribedUnitCode && !["G", "KG", "ML", "L"].includes(item.prescribedUnitCode.trim().toUpperCase())))) ||
    (item.caloriesKcalSnapshot == null || item.proteinGSnapshot == null || item.carbohydrateGSnapshot == null || item.fatGSnapshot == null);

  return (
    <div
      id={`item-${item.publicId}`}
      className="p-2 sm:p-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-primary)] shadow-2xs hover:border-[var(--brand)]/40 transition-all space-y-2 w-full max-w-full min-w-0"
    >
      {/* ========================================================================= */}
      {/* DESKTOP LAYOUT (Single clean horizontal row)                              */}
      {/* ========================================================================= */}
      <div className="hidden sm:flex sm:items-center sm:justify-between gap-3 w-full min-w-0">
        {/* Left: Food name & status indicator */}
        <div className="flex items-center gap-2 min-w-0 flex-1 max-w-[40%]">
          <span className="font-semibold text-xs sm:text-sm text-[var(--text-primary)] truncate" title={item.foodNameSnapshot}>
            {item.foodNameSnapshot}
          </span>
          {item.foodId == null ? (
            <span
              onClick={() => setIsResolvePickerOpen(true)}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 shrink-0 cursor-pointer"
              title="Clique para vincular alimento"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              Sem vínculo
            </span>
          ) : hasIssues ? (
            <span
              onClick={() => setIsResolvePickerOpen(true)}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 shrink-0 cursor-pointer"
              title="Clique para revisar dados ausentes"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              Revisar dados
            </span>
          ) : null}
        </div>

        {/* Middle: Inline Quantity Input + Unit & Macros */}
        <div className="flex items-center gap-2 shrink-0 text-xs">
          {/* Direct quantity input */}
          <div className="flex items-center gap-1">
            {!readOnly ? (
              <input
                data-item-input={item.publicId}
                type="text"
                inputMode="decimal"
                value={localQuantity}
                onChange={(e) => handleQuantityChange(e.target.value)}
                placeholder="100"
                className="w-14 px-1.5 py-0.5 text-xs text-center font-bold rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)] transition-colors"
                title="Editar quantidade prescrita"
              />
            ) : (
              <span className="font-bold text-[var(--text-primary)]">
                {localQuantity}
              </span>
            )}
            <span className="text-xs text-[var(--text-secondary)] font-medium truncate max-w-[150px] inline-flex items-center gap-1">
              <span>{item.prescribedUnitLabel || item.prescribedUnitCode || "g"}</span>
              {equivGrams != null && (
                <span className="text-[11px] text-[var(--text-muted)] font-normal">
                  ({equivGrams}g)
                </span>
              )}
              {isMissingPortionConversion && (
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold bg-amber-500/10 px-1 py-0.2 rounded border border-amber-500/20">
                  Medida sem equivalência cadastrada
                </span>
              )}
            </span>
          </div>

          <span className="text-[var(--text-tertiary)]">•</span>

          {/* Macros snapshot / scaled preview */}
          <div className="flex items-center gap-1.5 font-mono text-[11px] text-[var(--text-secondary)]">
            <span className="font-bold text-[var(--brand)]">
              {displayKcal != null ? `${displayKcal} kcal` : "— kcal"}
            </span>
            <span className="text-[var(--text-tertiary)]">·</span>
            <span>P {displayP != null ? `${displayP}g` : "—"}</span>
            <span className="text-[var(--text-tertiary)]">·</span>
            <span>C {displayC != null ? `${displayC}g` : "—"}</span>
            <span className="text-[var(--text-tertiary)]">·</span>
            <span>G {displayG != null ? `${displayG}g` : "—"}</span>
          </div>
        </div>

        {/* Right: Substitutions toggle button & Action menu ⋮ */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Substitutions Toggle Button (if any) */}
          {item.substitutions.length > 0 && (
            <button
              type="button"
              onClick={() => setAreSubsExpanded(!areSubsExpanded)}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                areSubsExpanded
                  ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30"
                  : "bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] border border-[var(--border)]"
              }`}
              title="Expandir ou recolher substituições"
            >
              <span>Substituições ({item.substitutions.length})</span>
              {unverifiedSubsCount > 0 && (
                <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-amber-500 text-white shrink-0">
                  {unverifiedSubsCount}
                </span>
              )}
              <svg className={`w-3 h-3 transition-transform duration-200 ${areSubsExpanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          )}

          {/* Action Menu ⋮ Button */}
          {!readOnly && (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-lg hover:bg-[var(--surface-secondary)] cursor-pointer"
                title="Mais opções do alimento"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </button>

              {/* Dropdown Menu */}
              {isMenuOpen && (
                <div className="absolute right-0 top-full mt-1 w-52 rounded-xl bg-[var(--surface-primary)] border border-[var(--border)] shadow-lg py-1 z-30 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      setSubstitutionToReview(null);
                      setIsEquivalentsOpen(true);
                    }}
                    className="w-full text-left px-3 py-2 text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] flex items-center gap-2 cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5 text-[var(--brand)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Adicionar substituição</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      setIsEditingNotes(true);
                    }}
                    className="w-full text-left px-3 py-2 text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] flex items-center gap-2 cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5 text-[var(--text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                    </svg>
                    <span>{item.notes ? "Editar observação" : "Adicionar observação"}</span>
                  </button>

                  {item.micronutrientsSnapshotJson && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        setShowMicro(!showMicro);
                      }}
                      className="w-full text-left px-3 py-2 text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] flex items-center gap-2 cursor-pointer"
                    >
                      <svg className="w-3.5 h-3.5 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                      </svg>
                      <span>{showMicro ? "Ocultar micros" : "Ver micronutrientes"}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      setIsResolvePickerOpen(true);
                    }}
                    className="w-full text-left px-3 py-2 text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] flex items-center gap-2 cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <span>{item.foodId == null ? "Vincular à tabela" : "Trocar medida/porção"}</span>
                  </button>

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
                      onRemoveItem();
                    }}
                    className="w-full text-left px-3 py-2 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 flex items-center gap-2 cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span>Remover alimento</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SMARTPHONE LAYOUT (Clean 3-line layout)                                    */}
      {/* ========================================================================= */}
      <div className="flex sm:hidden flex-col gap-1.5 w-full min-w-0">
        {/* Line 1: Food name + Warnings + Action Menu ⋮ (No empty bottom row!) */}
        <div className="flex items-start justify-between gap-2 min-w-0 w-full">
          <div className="flex items-center gap-1.5 flex-wrap min-w-0 flex-1">
            <span className="font-bold text-xs text-[var(--text-primary)] leading-snug break-words">
              {item.foodNameSnapshot}
            </span>
            {item.foodId == null ? (
              <span
                onClick={() => setIsResolvePickerOpen(true)}
                className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 shrink-0"
              >
                Sem vínculo
              </span>
            ) : hasIssues ? (
              <span
                onClick={() => setIsResolvePickerOpen(true)}
                className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 shrink-0"
              >
                Revisar
              </span>
            ) : null}
          </div>

          {/* Action Menu ⋮ Mobile */}
          {!readOnly && (
            <div className="relative shrink-0" ref={menuRef}>
              <button
                type="button"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-lg hover:bg-[var(--surface-secondary)] min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </button>

              {/* Mobile Dropdown Menu */}
              {isMenuOpen && (
                <div className="absolute right-0 top-full mt-1 w-48 rounded-xl bg-[var(--surface-primary)] border border-[var(--border)] shadow-xl py-1 z-30 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      setSubstitutionToReview(null);
                      setIsEquivalentsOpen(true);
                    }}
                    className="w-full text-left px-3 py-2 text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] flex items-center gap-2"
                  >
                    <span>+ Adicionar substituição</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      setIsEditingNotes(true);
                    }}
                    className="w-full text-left px-3 py-2 text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] flex items-center gap-2"
                  >
                    <span>{item.notes ? "Editar nota" : "Adicionar nota"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      setIsResolvePickerOpen(true);
                    }}
                    className="w-full text-left px-3 py-2 text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] flex items-center gap-2"
                  >
                    <span>{item.foodId == null ? "Vincular à tabela" : "Trocar medida"}</span>
                  </button>
                  {onMoveUp && !isFirst && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onMoveUp();
                      }}
                      className="w-full text-left px-3 py-2 text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] flex items-center gap-2"
                    >
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
                      className="w-full text-left px-3 py-2 text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] flex items-center gap-2"
                    >
                      <span>Mover para baixo</span>
                    </button>
                  )}
                  <div className="border-t border-[var(--border-subtle)] my-1" />
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onRemoveItem();
                    }}
                    className="w-full text-left px-3 py-2 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 flex items-center gap-2"
                  >
                    <span>Remover alimento</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Line 2: Inline Quantity Input + Measure & Weight */}
        <div className="flex items-center gap-2 text-xs flex-wrap">
          {!readOnly ? (
            <input
              data-item-input={item.publicId}
              type="text"
              inputMode="decimal"
              value={localQuantity}
              onChange={(e) => handleQuantityChange(e.target.value)}
              placeholder="100"
              className="w-16 px-2 py-2 text-base sm:text-xs text-center font-bold rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)] min-h-[44px]"
            />
          ) : (
            <span className="font-bold text-sm text-[var(--text-primary)]">{localQuantity}</span>
          )}
          <span className="text-[var(--text-secondary)]">
            {item.prescribedUnitLabel || item.prescribedUnitCode || "g"}
            {equivGrams != null && (
              <span className="text-[11px] text-[var(--text-muted)] font-normal ml-1">
                ({equivGrams}g)
              </span>
            )}
            {isMissingPortionConversion && (
              <span className="block text-[10px] text-amber-600 dark:text-amber-400 font-semibold bg-amber-500/10 px-1 py-0.2 rounded border border-amber-500/20 mt-0.5">
                Medida sem equivalência cadastrada
              </span>
            )}
          </span>
        </div>

        {/* Line 3: Macros + Substitutions toggle */}
        <div className="flex items-center justify-between gap-2 text-[11px] pt-0.5">
          <div className="flex items-center gap-1.5 font-mono text-[var(--text-secondary)] flex-wrap">
            <span className="font-bold text-[var(--brand)]">
              {displayKcal != null ? `${displayKcal} kcal` : "—"}
            </span>
            <span>·</span>
            <span>P {displayP != null ? `${displayP}g` : "—"}</span>
            <span>·</span>
            <span>C {displayC != null ? `${displayC}g` : "—"}</span>
            <span>·</span>
            <span>G {displayG != null ? `${displayG}g` : "—"}</span>
          </div>

          {item.substitutions.length > 0 && (
            <button
              type="button"
              onClick={() => setAreSubsExpanded(!areSubsExpanded)}
              className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 shrink-0"
            >
              {item.substitutions.length} subs {areSubsExpanded ? "▲" : "▼"}
            </button>
          )}
        </div>
      </div>

      {/* Notes Display or Inline Edit Form */}
      {item.notes && !isEditingNotes && (
        <div className="text-[11px] text-[var(--text-muted)] italic px-1 flex items-center justify-between">
          <span>· {item.notes}</span>
          {!readOnly && (
            <button
              type="button"
              onClick={() => setIsEditingNotes(true)}
              className="text-[10px] text-[var(--brand)] hover:underline ml-2"
            >
              editar
            </button>
          )}
        </div>
      )}

      {isEditingNotes && (
        <div className="p-2.5 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border)] space-y-2">
          <label className="block text-[11px] font-semibold text-[var(--text-secondary)]">
            Observações de consumo:
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ex: sem sal, grelhado sem óleo..."
            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[var(--border)] bg-[var(--surface-primary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)]"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsEditingNotes(false)}
              className="px-2.5 py-1 text-xs rounded-lg border border-[var(--border)] text-[var(--text-secondary)]"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSaveNotes}
              className="px-3 py-1 text-xs rounded-lg bg-[var(--brand)] text-white font-medium hover:opacity-90"
            >
              Salvar nota
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBSTITUTIONS SUB-TREE (Collapsed by default!)                           */}
      {/* ========================================================================= */}
      {areSubsExpanded && item.substitutions.length > 0 && (
        <div className="space-y-1.5 pt-2 border-t border-[var(--border-subtle)] animate-in fade-in duration-150">
          <div className="flex items-center justify-between text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider px-1">
            <span>Opções de Substituição (OU)</span>
            <span>{item.substitutions.length} alternativa{item.substitutions.length > 1 ? "s" : ""}</span>
          </div>

          <div className="space-y-1.5">
            {item.substitutions
              .filter((sub, idx, arr) => {
                if (sub.foodId != null) {
                  return arr.findIndex((s) => s.foodId === sub.foodId) === idx;
                }
                return arr.findIndex((s) => s.publicId === sub.publicId) === idx;
              })
              .map((sub, idx, arr) => (
                <NutritionSubstitutionEditor
                  key={sub.publicId}
                  slug={slug}
                  substitution={sub}
                  readOnly={readOnly}
                  isFirst={idx === 0}
                  isLast={idx === arr.length - 1}
                  onUpdate={(data) => onUpdateSubstitution(sub.publicId, data)}
                  onRemove={() => onRemoveSubstitution(sub.publicId)}
                  onMoveUp={() => handleMoveSub(idx, "UP")}
                  onMoveDown={() => handleMoveSub(idx, "DOWN")}
                  onReviewOrRecalculate={(targetSub) => {
                    setSubstitutionToReview(targetSub);
                    setIsEquivalentsOpen(true);
                  }}
                  onCompare={() => setSubstitutionToCompare(sub)}
                />
              ))}
          </div>

          {/* Quick Actions at bottom of expanded substitutions */}
          {!readOnly && (
            <div className="pt-1.5 flex items-center gap-2 flex-wrap text-xs">
              <button
                type="button"
                onClick={() => {
                  setSubstitutionToReview(null);
                  setIsEquivalentsOpen(true);
                }}
                className="text-xs text-[var(--brand)] hover:underline font-semibold inline-flex items-center gap-1 px-2 py-1 rounded-md hover:bg-[var(--brand)]/5 cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                <span>+ Adicionar Substituição</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSubstitutionToReview(null);
                  setIsEquivalentsOpen(true);
                }}
                className="text-xs text-amber-700 dark:text-amber-400 hover:underline font-semibold inline-flex items-center gap-1 px-2 py-1 rounded-md hover:bg-amber-500/10 cursor-pointer"
                title="Calcular quantidade equivalente com base em energia, proteína, carboidrato ou gordura"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <span>Recalcular equivalentes</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Item Micronutrients Breakdown */}
      {showMicro && item.micronutrientsSnapshotJson && (
        <div className="pt-2">
          <NutritionMicronutrientsPanel
            totals={calculateMealMicronutrientTotals([item])}
            title={`Micronutrientes — ${item.foodNameSnapshot}`}
            defaultCollapsed={false}
          />
        </div>
      )}

      {/* Equivalents Calculator & Review Modal */}
      <NutritionEquivalentsModal
        slug={slug}
        isOpen={isEquivalentsOpen}
        onClose={() => {
          setIsEquivalentsOpen(false);
          setSubstitutionToReview(null);
        }}
        prescribedItem={item}
        substitutionToReview={substitutionToReview}
        onAddSubstitution={onAddSubstitution}
        onUpdateSubstitution={onUpdateSubstitution}
        initialFoods={initialFoodsForEquivalents}
      />

      {/* Side-by-side Compare Modal */}
      {substitutionToCompare && (
        <NutritionSubstitutionCompareModal
          isOpen={true}
          onClose={() => setSubstitutionToCompare(null)}
          primaryItem={item}
          substitution={substitutionToCompare}
          onUpdateSubstitution={onUpdateSubstitution}
        />
      )}

      {/* Food Picker for Resolving Pending Item or Choosing Registered Portions */}
      <NutritionFoodPicker
        slug={slug}
        isOpen={isResolvePickerOpen}
        onClose={() => setIsResolvePickerOpen(false)}
        initialQuery={extractCleanFoodQuery(item.foodNameSnapshot)}
        disableCustomTab={true}
        onSelect={async (selection) => {
          await onUpdateItem({
            foodPublicId: selection.foodPublicId || undefined,
            portionPublicId: selection.portionPublicId || null,
            prescribedQuantity: selection.prescribedQuantity ?? item.prescribedQuantity,
            prescribedUnitCode: selection.prescribedUnitCode ?? item.prescribedUnitCode,
            prescribedUnitLabel: selection.prescribedUnitLabel ?? item.prescribedUnitLabel,
          });
          setIsResolvePickerOpen(false);
        }}
        title={item.foodId == null ? `Vincular Alimento para "${item.foodNameSnapshot}"` : `Escolher Medida para "${item.foodNameSnapshot}"`}
      />
    </div>
  );
}

function extractCleanFoodQuery(raw: string): string {
  if (!raw) return "";
  let clean = raw.trim();
  clean = clean.replace(/^(fruta|prote[ií]na|carboidrato|gordura|vegetal|salada|bebida|doce)\s*:\s*/i, "");
  clean = clean.replace(/\([^)]*\)/g, "");
  clean = clean.replace(/^\d+([.,]\d+)?\s*(g|kg|ml|l|colheres|colher|fatias|fatia|unidades|unidade|escumadeira|concha)?(\s+de)?\s+/i, "");
  return clean.trim() || raw.trim();
}
