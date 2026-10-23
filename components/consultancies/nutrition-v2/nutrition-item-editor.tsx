"use client";

import React, { useState, useRef, useEffect } from "react";
import type {
  MealItemWithSubstitutionsDto,
  ItemSubstitutionDto,
  AddMealItemInput,
  UpdateMealItemInput,
  AddSubstitutionInput,
  UpdateSubstitutionInput,
} from "@/lib/nutrition-v2/plan-repository";
import { NutritionSubstitutionEditor } from "./nutrition-substitution-editor";
import { NutritionSubstitutionCompareModal } from "./nutrition-substitution-compare-modal";
import { NutritionFoodPicker } from "./nutrition-food-picker";
import { NutritionEquivalentsModal } from "./nutrition-equivalents-modal";
import {
  NutritionCustomMeasureModal,
  type FoodPortionOption,
} from "./nutrition-custom-measure-modal";
import type { FoodListItemDto } from "@/lib/nutrition-v2/food-repository";
import { calculateMealMicronutrientTotals } from "@/lib/nutrition-v2/nutrient-calculator";
import { NutritionMicronutrientsPanel } from "./nutrition-micronutrients-panel";
import { getFoodPortionsForPickerAction } from "@/app/consultoria/[slug]/planos-v2/actions";

interface NutritionItemEditorProps {
  slug: string;
  item: MealItemWithSubstitutionsDto;
  readOnly?: boolean;
  onLiveQuantityChange?: (itemPublicId: string, quantity: number | null) => void;
  onUpdateItem: (data: UpdateMealItemInput) => Promise<void>;
  onRemoveItem: () => Promise<void>;
  onMoveUp?: () => Promise<void>;
  onMoveDown?: () => Promise<void>;
  isFirst: boolean;
  isLast: boolean;
  onAddItemToMeal?: (payload: AddMealItemInput) => Promise<void>;
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
  onAddItemToMeal,
  onAddSubstitution,
  onUpdateSubstitution,
  onRemoveSubstitution,
  onReorderSubstitutions,
  initialFoodsForEquivalents,
}: NutritionItemEditorProps) {
  // Inline quantity input state
  const [localQuantity, setLocalQuantity] = useState(
    item.prescribedQuantity != null ? formatNumberForDisplay(item.prescribedQuantity) : ""
  );
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notes, setNotes] = useState(item.notes || "");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [areSubsExpanded, setAreSubsExpanded] = useState(false);

  // Available portions / measures loaded for this food
  const [availablePortions, setAvailablePortions] = useState<FoodPortionOption[]>([]);
  const [selectedMeasureKey, setSelectedMeasureKey] = useState<string>("G");
  const [foodReferenceUnit, setFoodReferenceUnit] = useState<string>("G");
  const [isCustomMeasureModalOpen, setIsCustomMeasureModalOpen] = useState(false);
  const [practicalRoundingSuggestion, setPracticalRoundingSuggestion] = useState<{
    roundedQty: number;
    label: string;
    gramsDiff: number;
    percentDiff: number;
  } | null>(null);

  // Sync external quantity when item changes outside inline editing using render-phase check
  const [prevItemSnapshot, setPrevItemSnapshot] = useState({
    qty: item.prescribedQuantity,
    notes: item.notes,
    unitLabel: item.prescribedUnitLabel,
    unitCode: item.prescribedUnitCode,
    portionEquivalent: item.portionEquivalentAmount,
  });

  if (
    prevItemSnapshot.qty !== item.prescribedQuantity ||
    prevItemSnapshot.notes !== item.notes ||
    prevItemSnapshot.unitLabel !== item.prescribedUnitLabel ||
    prevItemSnapshot.unitCode !== item.prescribedUnitCode ||
    prevItemSnapshot.portionEquivalent !== item.portionEquivalentAmount
  ) {
    setPrevItemSnapshot({
      qty: item.prescribedQuantity,
      notes: item.notes,
      unitLabel: item.prescribedUnitLabel,
      unitCode: item.prescribedUnitCode,
      portionEquivalent: item.portionEquivalentAmount,
    });
    setLocalQuantity(item.prescribedQuantity != null ? formatNumberForDisplay(item.prescribedQuantity) : "");
    setNotes(item.notes || "");
  }

  // Modals & Panels
  const [isResolvePickerOpen, setIsResolvePickerOpen] = useState(false);
  const [isEquivalentsOpen, setIsEquivalentsOpen] = useState(false);
  const [substitutionToReview, setSubstitutionToReview] = useState<ItemSubstitutionDto | null>(null);
  const [substitutionToCompare, setSubstitutionToCompare] = useState<ItemSubstitutionDto | null>(null);
  const [showMicro, setShowMicro] = useState(false);

  // Desktop and mobile layouts render separate ⋮ menus that share the same
  // open state. Each layout MUST have its own ref: with a single shared ref,
  // the ref ends up pointing at the mobile container only, so on desktop the
  // click-away listener (mousedown) closes the menu before the click event
  // reaches the menu item — making every desktop menu action a no-op
  // ("+ Adicionar substituição", "Remover alimento", etc.).
  const desktopMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Click away listener for menu (must check BOTH layout containers)
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const insideDesktop = desktopMenuRef.current?.contains(target);
      const insideMobile = mobileMenuRef.current?.contains(target);
      if (!insideDesktop && !insideMobile) {
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

  // Load portions for this item's food
  useEffect(() => {
    let isCancelled = false;
    if (!item.foodPublicId || !slug) return;

    getFoodPortionsForPickerAction(slug, item.foodPublicId).then((res) => {
      if (isCancelled) return;
      if (res.success && res.data) {
        const refUnit = (res.data.referenceUnitCode || "G").trim().toUpperCase();
        setFoodReferenceUnit(refUnit);

        const rawPortions = (res.data.portions || []) as Array<{
          publicId: string;
          label: string;
          equivalentReferenceAmount: number;
          status?: string;
          scope?: "GLOBAL" | "CONSULTANCY" | "PERSONAL";
          notes?: string | null;
        }>;

        const activePortions: FoodPortionOption[] = rawPortions
          .filter((p) => (p.status || "ACTIVE") === "ACTIVE")
          .map((p) => ({
            publicId: p.publicId,
            label: p.label,
            equivalentReferenceAmount: Number(p.equivalentReferenceAmount),
            scope: p.scope,
            notes: p.notes,
          }));

        setAvailablePortions(activePortions);

        // Resolve active measure key
        if (item.prescribedUnitLabel) {
          const match = activePortions.find(
            (p) => p.label.trim().toLowerCase() === item.prescribedUnitLabel!.trim().toLowerCase()
          );
          if (match) {
            setSelectedMeasureKey(match.publicId);
            return;
          }
        }

        const code = (item.prescribedUnitCode || "").trim().toUpperCase();
        if (code === "ML" || code === "L" || refUnit === "ML") {
          setSelectedMeasureKey("ML");
        } else {
          setSelectedMeasureKey("G");
        }
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [slug, item.foodPublicId, item.prescribedUnitLabel, item.prescribedUnitCode]);

  // Is volume-based food
  const isVolumeFood = foodReferenceUnit === "ML" || foodReferenceUnit === "L";
  const standardUnitLabel = isVolumeFood ? "Mililitros (ml)" : "Gramas (g)";
  const standardUnitCode = isVolumeFood ? "ML" : "G";
  const standardUnitShort = isVolumeFood ? "ml" : "g";

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
  // Active portion reference amount
  const currentPortion = availablePortions.find((p) => p.publicId === selectedMeasureKey);
  const activeEquivalent = currentPortion
    ? currentPortion.equivalentReferenceAmount
    : (item.portionEquivalentAmount != null && item.portionEquivalentAmount > 0 ? item.portionEquivalentAmount : null);

  const equivGrams = activeEquivalent != null && activeEquivalent > 0
    ? Math.round((isCustomQtyValid ? parsedLocalQty! : (item.prescribedQuantity || 0)) * activeEquivalent * 10) / 10
    : null;

  const isMissingPortionConversion = item.foodId != null &&
    item.prescribedUnitCode &&
    !["G", "KG", "ML", "L"].includes(item.prescribedUnitCode.trim().toUpperCase()) &&
    (activeEquivalent == null || activeEquivalent <= 0) &&
    item.caloriesKcalSnapshot == null;

  // Debounced quantity save + live synchronous propagation
  const handleQuantityChange = (newVal: string) => {
    setLocalQuantity(newVal);
    setPracticalRoundingSuggestion(null);
    const parsed = newVal ? parseFloat(newVal.replace(",", ".")) : null;
    const validQty = parsed != null && Number.isFinite(parsed) && parsed > 0 ? parsed : null;

    // Immediately propagate to parent builder for instant meal and day totals
    onLiveQuantityChange?.(item.publicId, validQty);

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    debounceTimerRef.current = setTimeout(async () => {
      if (validQty != null) {
        let portionPublicId: string | null = null;
        let unitCode = standardUnitCode;
        let unitLabel = standardUnitLabel;

        if (selectedMeasureKey !== "G" && selectedMeasureKey !== "ML") {
          const pt = availablePortions.find((p) => p.publicId === selectedMeasureKey);
          if (pt) {
            portionPublicId = pt.publicId;
            unitCode = "PORCAO";
            unitLabel = pt.label;
          }
        }

        await onUpdateItem({
          prescribedQuantity: validQty,
          portionPublicId,
          prescribedUnitCode: unitCode,
          prescribedUnitLabel: unitLabel,
        });
      }
    }, 600);
  };

  // Smart switching of measure while preserving physical quantity (Section 4)
  const handleMeasureChange = async (newKey: string) => {
    if (newKey === "__CREATE_CUSTOM__") {
      setIsCustomMeasureModalOpen(true);
      return;
    }

    const currentQtyNum = localQuantity ? parseFloat(localQuantity.replace(",", ".")) : (item.prescribedQuantity || 0);

    // Determine previous physical amount
    let prevEq = 1;
    if (selectedMeasureKey !== "G" && selectedMeasureKey !== "ML") {
      const prevPt = availablePortions.find((p) => p.publicId === selectedMeasureKey);
      if (prevPt && prevPt.equivalentReferenceAmount > 0) {
        prevEq = prevPt.equivalentReferenceAmount;
      } else if (item.portionEquivalentAmount && item.portionEquivalentAmount > 0) {
        prevEq = item.portionEquivalentAmount;
      }
    }

    // Determine new equivalent
    let newEq = 1;
    let newPortionPublicId: string | null = null;
    let newUnitLabel = standardUnitLabel;
    let newUnitCode = standardUnitCode;

    if (newKey !== "G" && newKey !== "ML") {
      const targetPt = availablePortions.find((p) => p.publicId === newKey);
      if (targetPt && targetPt.equivalentReferenceAmount > 0) {
        newEq = targetPt.equivalentReferenceAmount;
        newPortionPublicId = targetPt.publicId;
        newUnitLabel = targetPt.label;
        newUnitCode = "PORCAO";
      }
    } else if (newKey === "ML") {
      newUnitLabel = "Mililitros (ml)";
      newUnitCode = "ML";
    }

    // Convert quantity preserving physical quantity
    let convertedQty = currentQtyNum;
    if (Number.isFinite(currentQtyNum) && currentQtyNum > 0 && prevEq > 0 && newEq > 0) {
      const physicalAmount = currentQtyNum * prevEq;
      convertedQty = physicalAmount / newEq;

      // Check if long decimal fraction merits practical rounding suggestion
      if (newKey !== "G" && newKey !== "ML") {
        const nearestHalf = Math.round(convertedQty * 2) / 2;
        const diffFromPractical = Math.abs(convertedQty - nearestHalf);
        if (diffFromPractical > 0.04 && nearestHalf > 0) {
          const gramsDelta = Math.round((nearestHalf * newEq - physicalAmount) * 10) / 10;
          const pctDelta = Math.round((gramsDelta / physicalAmount) * 1000) / 10;
          setPracticalRoundingSuggestion({
            roundedQty: nearestHalf,
            label: `${formatNumberForDisplay(nearestHalf)} ${newUnitLabel}`,
            gramsDiff: gramsDelta,
            percentDiff: pctDelta,
          });
        } else {
          setPracticalRoundingSuggestion(null);
        }
      } else {
        setPracticalRoundingSuggestion(null);
      }
    }

    setSelectedMeasureKey(newKey);
    const formatted = formatNumberForDisplay(convertedQty);
    setLocalQuantity(formatted);
    onLiveQuantityChange?.(item.publicId, convertedQty);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    await onUpdateItem({
      prescribedQuantity: convertedQty,
      portionPublicId: newPortionPublicId,
      prescribedUnitCode: newUnitCode,
      prescribedUnitLabel: newUnitLabel,
    });
  };

  // Immediate flush of pending quantity changes and opening of equivalents modal
  const handleOpenEquivalents = async () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
      const parsed = localQuantity ? parseFloat(localQuantity.replace(",", ".")) : null;
      const validQty = parsed != null && Number.isFinite(parsed) && parsed > 0 ? parsed : null;
      if (validQty != null && validQty !== item.prescribedQuantity) {
        await onUpdateItem({ prescribedQuantity: validQty });
      }
    }
    setSubstitutionToReview(null);
    setIsEquivalentsOpen(true);
  };

  // Callback when a new custom measure is created in modal
  const handleCustomMeasureCreated = async (newPortion: FoodPortionOption) => {
    setAvailablePortions((prev) => {
      const filtered = prev.filter((p) => p.publicId !== newPortion.publicId);
      return [...filtered, newPortion];
    });
    await handleMeasureChange(newPortion.publicId);
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
      {/* DESKTOP LAYOUT (Clean unified row)                                       */}
      {/* ========================================================================= */}
      <div className="hidden sm:flex sm:items-center sm:justify-between gap-3 w-full min-w-0">
        {/* Left: Food name & status indicator */}
        <div className="flex items-center gap-2 min-w-0 flex-1 max-w-[32%]">
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

        {/* Middle: Quantity + Measure Selector + Conversion + Macros */}
        <div className="flex items-center gap-2 shrink-0 text-xs">
          {/* Quantity Input */}
          {!readOnly ? (
            <input
              data-item-input={item.publicId}
              type="text"
              inputMode="decimal"
              value={localQuantity}
              onChange={(e) => handleQuantityChange(e.target.value)}
              placeholder="100"
              className="w-14 px-1.5 py-1 text-xs text-center font-bold rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)] transition-colors min-h-[32px]"
              title="Quantidade prescrita"
            />
          ) : (
            <span className="font-bold text-[var(--text-primary)] px-1">
              {localQuantity}
            </span>
          )}

          {/* Measure Selector Dropdown */}
          {!readOnly && item.foodPublicId ? (
            <select
              value={selectedMeasureKey}
              onChange={(e) => handleMeasureChange(e.target.value)}
              className="text-xs font-semibold px-2 py-1 rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)] transition-colors min-h-[32px] max-w-[170px] truncate cursor-pointer"
              title="Selecione a medida deste alimento"
            >
              <optgroup label="Unidade Padrão">
                <option value={isVolumeFood ? "ML" : "G"}>
                  {standardUnitLabel}
                </option>
              </optgroup>

              {availablePortions.length > 0 ? (
                <optgroup label="Medidas do Alimento">
                  {availablePortions.map((p) => (
                    <option key={p.publicId} value={p.publicId}>
                      {p.label} · {p.equivalentReferenceAmount} {standardUnitShort}
                      {p.scope === "PERSONAL" ? " (Pessoal)" : p.scope === "CONSULTANCY" ? " (Consultoria)" : ""}
                    </option>
                  ))}
                </optgroup>
              ) : (
                <optgroup label="Medidas do Alimento">
                  <option value="" disabled>
                    Sem medidas caseiras cadastradas
                  </option>
                </optgroup>
              )}

              <optgroup label="Personalização">
                <option value="__CREATE_CUSTOM__">+ Cadastrar medida...</option>
              </optgroup>
            </select>
          ) : (
            <span className="text-xs font-semibold text-[var(--text-secondary)]">
              {item.prescribedUnitLabel || item.prescribedUnitCode || standardUnitShort}
            </span>
          )}

          {/* Empty state informative label with quick add button */}
          {!readOnly && item.foodPublicId && availablePortions.length === 0 && (
            <span className="inline-flex items-center gap-1.5 text-[11px] text-[var(--text-tertiary)] italic">
              <span>Este alimento ainda não tem medidas caseiras cadastradas.</span>
              <button
                type="button"
                onClick={() => setIsCustomMeasureModalOpen(true)}
                className="not-italic font-semibold text-[var(--brand)] hover:underline cursor-pointer"
              >
                + Cadastrar medida
              </button>
            </span>
          )}

          {/* Corresponding Conversion Display */}
          {selectedMeasureKey !== "G" && selectedMeasureKey !== "ML" && equivGrams != null && (
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-md border border-emerald-500/20 whitespace-nowrap" title="Equivalência física correspondente">
              = {equivGrams} {standardUnitShort}
            </span>
          )}

          {isMissingPortionConversion && (
            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold bg-amber-500/10 px-1.5 py-0.5 rounded-md border border-amber-500/20 whitespace-nowrap">
              Conversão não cadastrada para esta medida.
            </span>
          )}

          <span className="text-[var(--text-tertiary)]">•</span>

          {/* Macros snapshot / preview */}
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

        {/* Right: Substitutions toggle button, Equivalentes & Action menu ⋮ */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Equivalentes Button Desktop */}
          {!readOnly && (
            <button
              type="button"
              onClick={handleOpenEquivalents}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 min-h-[32px] rounded-lg text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition-all cursor-pointer shadow-2xs hover:scale-[1.02] active:scale-[0.98]"
              title="Calcular equivalência nutricional deste alimento"
            >
              <svg className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <span>Equivalentes</span>
            </button>
          )}

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
            <div className="relative" ref={desktopMenuRef}>
              <button
                type="button"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-lg hover:bg-[var(--surface-secondary)] cursor-pointer min-h-[32px] min-w-[32px] flex items-center justify-center"
                title="Mais opções do alimento"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </button>

              {/* Dropdown Menu */}
              {isMenuOpen && (
                <div className="absolute right-0 top-full mt-1 w-56 rounded-xl bg-[var(--surface-primary)] border border-[var(--border)] shadow-lg py-1 z-30 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      handleOpenEquivalents();
                    }}
                    className="w-full text-left px-3 py-2 text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] flex items-center gap-2 cursor-pointer font-semibold"
                  >
                    <svg className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <span>Equivalência nutricional</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      setIsCustomMeasureModalOpen(true);
                    }}
                    className="w-full text-left px-3 py-2 text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] flex items-center gap-2 cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Cadastrar nova medida</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      setSubstitutionToReview(null);
                      setIsEquivalentsOpen(true);
                    }}
                    className="w-full text-left px-3 py-2 text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] flex items-center gap-2 cursor-pointer"
                  >
                    <span>+ Adicionar substituição</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      setIsEditingNotes(true);
                    }}
                    className="w-full text-left px-3 py-2 text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] flex items-center gap-2 cursor-pointer"
                  >
                    <span>{item.notes ? "Editar nota de preparo" : "Adicionar nota"}</span>
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

      {/* Practical Rounding Banner (Desktop & Mobile) */}
      {practicalRoundingSuggestion && !readOnly && (
        <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-sky-500/10 border border-sky-500/25 text-xs text-sky-900 dark:text-sky-200 animate-in fade-in duration-150">
          <div className="flex items-center gap-1.5 min-w-0">
            <svg className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="truncate">
              Fração longa convertida. Deseja arredondar para porção prática?
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={async () => {
                const targetQty = practicalRoundingSuggestion.roundedQty;
                setPracticalRoundingSuggestion(null);
                setLocalQuantity(formatNumberForDisplay(targetQty));
                onLiveQuantityChange?.(item.publicId, targetQty);
                await onUpdateItem({ prescribedQuantity: targetQty });
              }}
              className="px-2.5 py-1 rounded-lg text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white shadow-2xs cursor-pointer transition-colors"
            >
              Arredondar para {practicalRoundingSuggestion.label} ({practicalRoundingSuggestion.gramsDiff > 0 ? "+" : ""}{practicalRoundingSuggestion.gramsDiff}{standardUnitShort})
            </button>
            <button
              type="button"
              onClick={() => setPracticalRoundingSuggestion(null)}
              className="p-1 text-sky-700 dark:text-sky-300 hover:bg-sky-500/20 rounded-md cursor-pointer"
              title="Ignorar sugestão"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SMARTPHONE LAYOUT (Clean 3-line layout)                                    */}
      {/* ========================================================================= */}
      <div className="flex sm:hidden flex-col gap-2 w-full min-w-0">
        {/* Line 1: Food name + Warnings + Action Menu ⋮ */}
        <div className="flex items-start justify-between gap-2 min-w-0 w-full">
          <div className="flex items-center gap-1.5 flex-wrap min-w-0 flex-1">
            <span className="font-bold text-xs text-[var(--text-primary)] leading-snug break-words">
              {item.foodNameSnapshot}
            </span>
            {item.foodId == null ? (
              <span
                onClick={() => setIsResolvePickerOpen(true)}
                className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 shrink-0 cursor-pointer"
              >
                Sem vínculo
              </span>
            ) : hasIssues ? (
              <span
                onClick={() => setIsResolvePickerOpen(true)}
                className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 shrink-0 cursor-pointer"
              >
                Revisar
              </span>
            ) : null}
          </div>

          {/* Action Menu ⋮ Mobile */}
          {!readOnly && (
            <div className="relative shrink-0" ref={mobileMenuRef}>
              <button
                type="button"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-lg hover:bg-[var(--surface-secondary)] min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </button>

              {/* Mobile Dropdown Menu */}
              {isMenuOpen && (
                <div className="absolute right-0 top-full mt-1 w-52 rounded-xl bg-[var(--surface-primary)] border border-[var(--border)] shadow-xl py-1 z-30 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      handleOpenEquivalents();
                    }}
                    className="w-full text-left px-3 py-2 text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] flex items-center gap-2 font-semibold"
                  >
                    <svg className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <span>Equivalência nutricional</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      setIsCustomMeasureModalOpen(true);
                    }}
                    className="w-full text-left px-3 py-2 text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] flex items-center gap-2"
                  >
                    <span>+ Cadastrar nova medida</span>
                  </button>

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

        {/* Line 2: Quantity Input + Measure Selector + Conversion Display */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          {/* Quantity Input */}
          {!readOnly ? (
            <input
              data-item-input={item.publicId}
              type="text"
              inputMode="decimal"
              value={localQuantity}
              onChange={(e) => handleQuantityChange(e.target.value)}
              placeholder="100"
              className="w-16 px-2 py-2 text-base text-center font-bold rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)] min-h-[44px]"
            />
          ) : (
            <span className="font-bold text-sm text-[var(--text-primary)] px-2">{localQuantity}</span>
          )}

          {/* Measure Selector Dropdown Mobile */}
          {!readOnly && item.foodPublicId ? (
            <select
              value={selectedMeasureKey}
              onChange={(e) => handleMeasureChange(e.target.value)}
              className="text-sm font-semibold px-2.5 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)] min-h-[44px] flex-1 min-w-[130px] truncate"
            >
              <optgroup label="Unidade Padrão">
                <option value={isVolumeFood ? "ML" : "G"}>
                  {standardUnitLabel}
                </option>
              </optgroup>

              {availablePortions.length > 0 ? (
                <optgroup label="Medidas do Alimento">
                  {availablePortions.map((p) => (
                    <option key={p.publicId} value={p.publicId}>
                      {p.label} · {p.equivalentReferenceAmount} {standardUnitShort}
                    </option>
                  ))}
                </optgroup>
              ) : (
                <optgroup label="Medidas do Alimento">
                  <option value="" disabled>
                    Sem medidas caseiras cadastradas
                  </option>
                </optgroup>
              )}

              <optgroup label="Personalização">
                <option value="__CREATE_CUSTOM__">+ Cadastrar medida...</option>
              </optgroup>
            </select>
          ) : (
            <span className="text-xs font-semibold text-[var(--text-secondary)]">
              {item.prescribedUnitLabel || item.prescribedUnitCode || standardUnitShort}
            </span>
          )}

          {/* Corresponding Conversion Display */}
          {selectedMeasureKey !== "G" && selectedMeasureKey !== "ML" && equivGrams != null && (
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20 whitespace-nowrap">
              = {equivGrams} {standardUnitShort}
            </span>
          )}

          {isMissingPortionConversion && (
            <span className="block w-full text-[10px] text-amber-600 dark:text-amber-400 font-semibold bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/20 mt-0.5">
              Conversão não cadastrada para esta medida.
            </span>
          )}
        </div>

        {/* Empty state message on mobile */}
        {!readOnly && item.foodPublicId && availablePortions.length === 0 && (
          <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-[11px] text-[var(--text-tertiary)]">
            <span className="truncate">Este alimento ainda não tem medidas caseiras cadastradas.</span>
            <button
              type="button"
              onClick={() => setIsCustomMeasureModalOpen(true)}
              className="shrink-0 font-semibold text-[var(--brand)] hover:underline cursor-pointer min-h-[36px] flex items-center px-1"
            >
              + Cadastrar
            </button>
          </div>
        )}

        {/* Line 3: Macros + Equivalentes + Substitutions toggle */}
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

          <div className="flex items-center gap-1.5 shrink-0">
            {!readOnly && (
              <button
                type="button"
                onClick={handleOpenEquivalents}
                className="inline-flex items-center gap-1 px-2.5 py-1 min-h-[36px] rounded-lg text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 shrink-0 cursor-pointer"
                title="Calcular equivalentes nutricionais"
              >
                <svg className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <span>Equivalentes</span>
              </button>
            )}

            {item.substitutions.length > 0 && (
              <button
                type="button"
                onClick={() => setAreSubsExpanded(!areSubsExpanded)}
                className="px-2.5 py-1 min-h-[36px] rounded-lg text-xs font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 shrink-0 cursor-pointer"
              >
                {item.substitutions.length} subs {areSubsExpanded ? "▲" : "▼"}
              </button>
            )}
          </div>
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
              className="text-[10px] text-[var(--brand)] hover:underline ml-2 cursor-pointer"
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
            className="w-full px-2.5 py-1.5 text-base sm:text-xs min-h-[44px] sm:min-h-[36px] rounded-lg border border-[var(--border)] bg-[var(--surface-primary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)]"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsEditingNotes(false)}
              className="px-2.5 py-1 text-xs rounded-lg border border-[var(--border)] text-[var(--text-secondary)] cursor-pointer min-h-[44px] sm:min-h-[32px] flex items-center"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSaveNotes}
              className="px-3 py-1 text-xs rounded-lg bg-[var(--brand)] text-white font-medium hover:opacity-90 cursor-pointer min-h-[44px] sm:min-h-[32px] flex items-center"
            >
              Salvar nota
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBSTITUTIONS SUB-TREE (Collapsed by default)                             */}
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
        onAddItemToMeal={onAddItemToMeal}
        onReplaceItem={onUpdateItem}
        initialFoods={initialFoodsForEquivalents}
      />

      {/* Custom Measure Modal */}
      <NutritionCustomMeasureModal
        isOpen={isCustomMeasureModalOpen}
        onClose={() => setIsCustomMeasureModalOpen(false)}
        slug={slug}
        foodPublicId={item.foodPublicId || ""}
        foodName={item.foodNameSnapshot}
        foodReferenceUnit={foodReferenceUnit}
        existingPortions={availablePortions}
        onMeasureCreated={handleCustomMeasureCreated}
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

      {/* Food Picker for Resolving Pending Item */}
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

function formatNumberForDisplay(num: number): string {
  if (!Number.isFinite(num)) return "";
  if (Number.isInteger(num)) return String(num);
  // Round to at most 2 decimal places cleanly
  const rounded = Math.round(num * 100) / 100;
  return String(rounded).replace(".", ",");
}

function extractCleanFoodQuery(raw: string): string {
  if (!raw) return "";
  let clean = raw.trim();
  clean = clean.replace(/^(fruta|prote[ií]na|carboidrato|gordura|vegetal|salada|bebida|doce)\s*:\s*/i, "");
  clean = clean.replace(/\([^)]*\)/g, "");
  clean = clean.replace(/^\d+([.,]\d+)?\s*(g|kg|ml|l|colheres|colher|fatias|fatia|unidades|unidade|escumadeira|concha)?(\s+de)?\s+/i, "");
  return clean.trim() || raw.trim();
}
