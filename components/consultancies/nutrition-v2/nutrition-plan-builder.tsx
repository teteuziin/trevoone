"use client";

import React, { useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { PlanVersionTreeDto, PlanVersionHistoryItemDto, MealWithItemsDto, MealItemWithSubstitutionsDto } from "@/lib/nutrition-v2/plan-repository";
import {
  updatePlanMetadataAction,
  addMealAction,
  updateMealAction,
  removeMealAction,
  reorderMealsAction,
  addMealItemAction,
  updateMealItemAction,
  removeMealItemAction,
  reorderMealItemsAction,
  addSubstitutionAction,
  updateSubstitutionAction,
  removeSubstitutionAction,
  reorderSubstitutionsAction,
  publishPlanVersionAction,
  publishPatientPlanUpdateAction,
  discardPatientPlanDraftAction,
  createNextVersionAction,
  getPlanVersionHistoryAction,
  getPlanVersionTreeAction,
  listPlanAssignmentsAction,
} from "@/app/consultoria/[slug]/planos-v2/actions";
import { NutritionMealEditor } from "./nutrition-meal-editor";
import { NutritionPublishDialog } from "./nutrition-publish-dialog";
import { NutritionSaveTemplateDialog } from "./nutrition-save-template-dialog";
import { NutritionVersionHistory } from "./nutrition-version-history";
import { NutritionAssignModal } from "./nutrition-assign-modal";
import { NutritionMicronutrientsPanel } from "./nutrition-micronutrients-panel";
import { NutritionPatientPreviewModal } from "./nutrition-patient-preview-modal";
import { NutritionBuilderPreferencesDrawer } from "./nutrition-builder-preferences-drawer";
import {
  type NutritionBuilderPreferences,
  DEFAULT_NUTRITION_BUILDER_PREFERENCES,
} from "@/lib/nutrition-v2/builder-preferences-types";
import { SettingsIcon } from "@/components/ui/icons";
import { AutosaveIndicator, type AutosaveStatus } from "./autosave-indicator";
import { MobileActionSheet } from "@/components/ui/mobile";
import type { AssignmentListItemDto } from "@/lib/nutrition-v2/assignment-repository";
import type { FoodSelectionResult } from "./nutrition-food-picker";
import type { AddSubstitutionInput } from "@/lib/nutrition-v2/plan-repository";
import type { PendingPublicationItem } from "@/lib/nutrition-v2/validation";
import { formatMacroGram, formatCaloriesKcal } from "@/lib/nutrition-v2/nutrition-plan-presentation";

export interface PatientBuilderContext {
  studentMembershipPublicId: string;
  studentPublicId: string;
  studentName: string;
  returnToUrl: string;
}

export interface PlanningTargetDto {
  caloriesKcal: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatsG: number | null;
}

interface NutritionPlanBuilderProps {
  slug: string;
  initialTree: PlanVersionTreeDto;
  initialAssignments?: AssignmentListItemDto[];
  patientContext?: PatientBuilderContext;
  origin?: string;
  originName?: string;
  planningTarget?: PlanningTargetDto;
  initialPreferences?: NutritionBuilderPreferences;
}

function ArrowLeftIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  );
}

function HistoryIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function CheckIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function UserPlusIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <line x1="20" y1="8" x2="20" y2="14" />
      <line x1="23" y1="11" x2="17" y2="11" />
    </svg>
  );
}

function PlusIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 5v14m-7-7h14" />
    </svg>
  );
}

function EyeIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function NutritionPlanBuilder({
  slug,
  initialTree,
  initialAssignments = [],
  patientContext,
  origin,
  originName,
  planningTarget,
  initialPreferences,
}: NutritionPlanBuilderProps) {
  const router = useRouter();
  const [tree, setTree] = useState<PlanVersionTreeDto>(initialTree);
  const [isDiscarding, setIsDiscarding] = useState(false);

  // Individual Nutritionist Builder Preferences
  const [preferences, setPreferences] = useState<NutritionBuilderPreferences>(
    initialPreferences || DEFAULT_NUTRITION_BUILDER_PREFERENCES
  );
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);

  // Tabs: Montagem, Análise, Orientações
  const [activeTab, setActiveTab] = useState<"BUILDER" | "ANALYSIS" | "GUIDANCE">("BUILDER");

  // Day group tabs: "ALL_DAYS" default
  const [selectedDayTab, setSelectedDayTab] = useState<string>("ALL_DAYS");

  // Expand / collapse all meals state
  const [allMealsCollapsed, setAllMealsCollapsed] = useState<boolean | undefined>(undefined);

  // Autosave indicator state
  const [autosaveStatus, setAutosaveStatus] = useState<AutosaveStatus>("idle");
  const [autosaveError, setAutosaveError] = useState<string | null>(null);

  const isReadOnly = tree.version.status !== "DRAFT";

  // In-place metadata editing state
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [title, setTitle] = useState(tree.version.title);
  const subtitle = tree.version.subtitle || "";
  const objective = tree.version.objective || "";
  const [generalGuidance, setGeneralGuidance] = useState(tree.version.generalGuidance || "");
  const [notes, setNotes] = useState(tree.version.notes || "");

  // Add meal state
  const [isAddingMeal, setIsAddingMeal] = useState(false);
  const [newMealTitle, setNewMealTitle] = useState("");
  const [newMealTime, setNewMealTime] = useState("");
  const [newMealNotes, setNewMealNotes] = useState("");

  // Modals & Drawers
  const [isPublishDialogOpen, setIsPublishDialogOpen] = useState(false);
  const [isSaveTemplateDialogOpen, setIsSaveTemplateDialogOpen] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isMicronutrientsDrawerOpen, setIsMicronutrientsDrawerOpen] = useState(false);

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyItems, setHistoryItems] = useState<PlanVersionHistoryItemDto[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const [isCreatingVersion, setIsCreatingVersion] = useState(false);
  const [assignments, setAssignments] = useState<AssignmentListItemDto[]>(initialAssignments);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isMobileActionSheetOpen, setIsMobileActionSheetOpen] = useState(false);

  // Undo delete engine
  const [deletedItemUndo, setDeletedItemUndo] = useState<{
    mealPublicId: string;
    item: MealItemWithSubstitutionsDto;
  } | null>(null);
  const undoTimerRef = useRef<NodeJS.Timeout | null>(null);

  const refreshAssignments = async () => {
    const res = await listPlanAssignmentsAction(slug, tree.plan.publicId);
    if (res.success && res.data) {
      setAssignments(res.data);
    }
  };

  const refreshTree = async () => {
    const res = await getPlanVersionTreeAction(slug, tree.plan.publicId, tree.version.publicId);
    if (res.success && res.data) {
      setTree(res.data);
    } else {
      router.refresh();
    }
  };

  // Open history dialog
  const handleOpenHistory = async () => {
    setIsHistoryOpen(true);
    setIsLoadingHistory(true);
    const res = await getPlanVersionHistoryAction(slug, tree.plan.publicId);
    if (res.success && res.data) {
      setHistoryItems(res.data);
    }
    setIsLoadingHistory(false);
  };

  // Handle Publish
  const handleConfirmPublish = async () => {
    setIsPublishing(true);
    setPublishError(null);

    if (patientContext) {
      const res = await publishPatientPlanUpdateAction(slug, {
        planPublicId: tree.plan.publicId,
        versionPublicId: tree.version.publicId,
        studentMembershipPublicId: patientContext.studentMembershipPublicId,
      });

      if (res.success) {
        setIsPublishDialogOpen(false);
        setIsPublishing(false);
        router.push(patientContext.returnToUrl);
        router.refresh();
      } else {
        setIsPublishing(false);
        setPublishError(res.error || "Não foi possível publicar a atualização do plano.");
      }
      return;
    }

    const res = await publishPlanVersionAction(slug, tree.plan.publicId, tree.version.publicId);

    if (res.success) {
      setIsPublishDialogOpen(false);
      setIsPublishing(false);
      router.refresh();
      await refreshTree();
    } else {
      setIsPublishing(false);
      setPublishError(res.error || "Não foi possível publicar o plano.");
    }
  };

  const handleDiscardDraft = async () => {
    if (!patientContext) return;
    const ok = window.confirm(
      "Deseja realmente descartar as alterações deste rascunho? Esta ação não pode ser desfeita."
    );
    if (!ok) return;

    setIsDiscarding(true);
    const res = await discardPatientPlanDraftAction(slug, patientContext.studentMembershipPublicId);
    if (res.success) {
      router.push(patientContext.returnToUrl);
      router.refresh();
    } else {
      setIsDiscarding(false);
      alert(res.error || "Erro ao descartar alterações.");
    }
  };

  // Handle Create Next Version
  const handleCreateNextVersion = async () => {
    if (isCreatingVersion) return;
    setIsCreatingVersion(true);

    const res = await createNextVersionAction(slug, tree.plan.publicId);
    if (res.success && res.data) {
      router.push(`/consultoria/${slug}/planos-v2/${tree.plan.publicId}?v=${res.data.versionPublicId}`);
      setTimeout(() => {
        window.location.reload();
      }, 100);
    } else {
      alert(res.error || "Erro ao criar nova versão.");
      setIsCreatingVersion(false);
    }
  };

  // Save metadata with autosave feedback
  const handleSaveMetadata = useCallback(
    async (overrideData?: {
      title?: string;
      subtitle?: string | null;
      objective?: string | null;
      generalGuidance?: string | null;
      notes?: string | null;
    }) => {
      const nextTitle = overrideData?.title ?? title;
      if (!nextTitle.trim()) {
        alert("O título do plano é obrigatório.");
        return;
      }

      setAutosaveStatus("saving");
      setAutosaveError(null);

      const res = await updatePlanMetadataAction(slug, tree.plan.publicId, tree.version.publicId, {
        title: nextTitle.trim(),
        subtitle: overrideData?.subtitle !== undefined ? overrideData.subtitle : (subtitle.trim() || null),
        objective: overrideData?.objective !== undefined ? overrideData.objective : (objective.trim() || null),
        generalGuidance: overrideData?.generalGuidance !== undefined ? overrideData.generalGuidance : (generalGuidance.trim() || null),
        notes: overrideData?.notes !== undefined ? overrideData.notes : (notes.trim() || null),
      });

      if (res.success) {
        setAutosaveStatus("saved");
        setIsEditingTitle(false);
        setTree((prev) => ({
          ...prev,
          version: {
            ...prev.version,
            title: nextTitle.trim(),
            subtitle: overrideData?.subtitle !== undefined ? overrideData.subtitle : (subtitle.trim() || null),
            objective: overrideData?.objective !== undefined ? overrideData.objective : (objective.trim() || null),
            generalGuidance: overrideData?.generalGuidance !== undefined ? overrideData.generalGuidance : (generalGuidance.trim() || null),
            notes: overrideData?.notes !== undefined ? overrideData.notes : (notes.trim() || null),
          },
        }));
        setTimeout(() => setAutosaveStatus("idle"), 3000);
      } else {
        setAutosaveStatus("error");
        setAutosaveError(res.error || "Erro ao salvar alterações.");
      }
    },
    [slug, tree.plan.publicId, tree.version.publicId, title, subtitle, objective, generalGuidance, notes]
  );

  // Add meal
  const handleCreateMeal = async () => {
    if (!newMealTitle.trim()) {
      alert("O nome da refeição é obrigatório.");
      return;
    }

    setAutosaveStatus("saving");
    const res = await addMealAction(slug, tree.plan.publicId, tree.version.publicId, {
      title: newMealTitle.trim(),
      scheduledTime: newMealTime.trim() || null,
      notes: newMealNotes.trim() || null,
    });

    if (res.success) {
      setAutosaveStatus("saved");
      setIsAddingMeal(false);
      setNewMealTitle("");
      setNewMealTime("");
      setNewMealNotes("");
      await refreshTree();
      setTimeout(() => setAutosaveStatus("idle"), 3000);
    } else {
      setAutosaveStatus("error");
      alert(res.error || "Erro ao adicionar refeição.");
    }
  };

  // Duplicate meal
  const handleDuplicateMeal = async (meal: MealWithItemsDto) => {
    setAutosaveStatus("saving");
    try {
      const res = await addMealAction(slug, tree.plan.publicId, tree.version.publicId, {
        title: `${meal.title} (Cópia)`,
        scheduledTime: meal.scheduledTime,
        notes: meal.notes,
      });

      if (res.success && res.data?.mealPublicId) {
        const newMealPublicId = res.data.mealPublicId;
        for (const item of meal.items) {
          const itemRes = await addMealItemAction(slug, tree.plan.publicId, newMealPublicId, {
            foodPublicId: item.foodPublicId,
            customName: item.foodId == null ? item.foodNameSnapshot : null,
            prescribedQuantity: item.prescribedQuantity,
            prescribedUnitCode: item.prescribedUnitCode,
            prescribedUnitLabel: item.prescribedUnitLabel,
            portionPublicId: null,
            notes: item.notes,
          });

          if (itemRes.success && itemRes.data?.itemPublicId && item.substitutions.length > 0) {
            for (const sub of item.substitutions) {
              await addSubstitutionAction(slug, tree.plan.publicId, itemRes.data.itemPublicId, {
                foodPublicId: sub.foodPublicId,
                customName: sub.foodId == null ? sub.foodNameSnapshot : null,
                prescribedQuantity: sub.prescribedQuantity,
                prescribedUnitCode: sub.prescribedUnitCode,
                prescribedUnitLabel: sub.prescribedUnitLabel,
                notes: sub.notes,
              });
            }
          }
        }
        await refreshTree();
        setAutosaveStatus("saved");
        setTimeout(() => setAutosaveStatus("idle"), 3000);
      }
    } catch {
      setAutosaveStatus("error");
    }
  };

  // Reorder meals
  const handleMoveMeal = async (index: number, direction: "UP" | "DOWN") => {
    const meals = [...tree.meals];
    const targetIdx = direction === "UP" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= meals.length) return;

    const temp = meals[index];
    meals[index] = meals[targetIdx];
    meals[targetIdx] = temp;

    setAutosaveStatus("saving");
    const res = await reorderMealsAction(
      slug,
      tree.plan.publicId,
      tree.version.publicId,
      meals.map((m) => m.publicId)
    );
    if (res.success) {
      setTree((prev) => ({ ...prev, meals }));
      setAutosaveStatus("saved");
      setTimeout(() => setAutosaveStatus("idle"), 3000);
    } else {
      setAutosaveStatus("error");
      alert(res.error || "Erro ao reordenar refeições.");
    }
  };

  // Remove Item with floating Undo Toast
  const handleRemoveItemWithUndo = async (mealPublicId: string, itemPublicId: string) => {
    const meal = tree.meals.find((m) => m.publicId === mealPublicId);
    const item = meal?.items.find((i) => i.publicId === itemPublicId);

    setAutosaveStatus("saving");
    const res = await removeMealItemAction(slug, tree.plan.publicId, itemPublicId);
    if (res.success) {
      await refreshTree();
      setAutosaveStatus("saved");
      setTimeout(() => setAutosaveStatus("idle"), 3000);

      if (item) {
        if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
        setDeletedItemUndo({ mealPublicId, item });
        undoTimerRef.current = setTimeout(() => {
          setDeletedItemUndo(null);
        }, 7000);
      }
    } else {
      setAutosaveStatus("error");
      alert(res.error || "Erro ao remover item.");
    }
  };

  // Restore deleted item
  const handleUndoRemoveItem = async () => {
    if (!deletedItemUndo) return;
    const { mealPublicId, item } = deletedItemUndo;
    setDeletedItemUndo(null);
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);

    setAutosaveStatus("saving");
    try {
      const res = await addMealItemAction(slug, tree.plan.publicId, mealPublicId, {
        foodPublicId: item.foodPublicId,
        customName: item.foodId == null ? item.foodNameSnapshot : null,
        prescribedQuantity: item.prescribedQuantity,
        prescribedUnitCode: item.prescribedUnitCode,
        prescribedUnitLabel: item.prescribedUnitLabel,
        portionPublicId: null,
        notes: item.notes,
      });

      if (res.success && res.data?.itemPublicId && item.substitutions.length > 0) {
        for (const sub of item.substitutions) {
          await addSubstitutionAction(slug, tree.plan.publicId, res.data.itemPublicId, {
            foodPublicId: sub.foodPublicId,
            customName: sub.foodId == null ? sub.foodNameSnapshot : null,
            prescribedQuantity: sub.prescribedQuantity,
            prescribedUnitCode: sub.prescribedUnitCode,
            prescribedUnitLabel: sub.prescribedUnitLabel,
            notes: sub.notes,
          });
        }
      }
      await refreshTree();
      setAutosaveStatus("saved");
      setTimeout(() => setAutosaveStatus("idle"), 3000);
    } catch {
      setAutosaveStatus("error");
    }
  };

  // Review item directly from publication checklist
  const handleReviewPublicationItem = (pendingItem: PendingPublicationItem) => {
    setIsPublishDialogOpen(false);
    const el = document.getElementById(`item-${pendingItem.itemPublicId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-2", "ring-amber-500");
      setTimeout(() => el.classList.remove("ring-2", "ring-amber-500"), 3500);
    }
  };

  // VET % calculations for Nutritional Analysis
  const totalKcal = tree.dailyTotals.caloriesKcal || 0;
  const pKcal = (tree.dailyTotals.proteinG || 0) * 4;
  const cKcal = (tree.dailyTotals.carbohydrateG || 0) * 4;
  const fKcal = (tree.dailyTotals.fatG || 0) * 9;
  const calculatedSum = pKcal + cKcal + fKcal;

  const pPct = calculatedSum > 0 ? Math.round((pKcal / calculatedSum) * 100) : 0;
  const cPct = calculatedSum > 0 ? Math.round((cKcal / calculatedSum) * 100) : 0;
  const fPct = calculatedSum > 0 ? Math.max(0, 100 - pPct - cPct) : 0;

  return (
    <div className="w-full max-w-full min-w-0 min-h-[calc(100vh-4rem)] bg-transparent px-3 sm:px-6 md:px-8 py-2.5 sm:py-5">
      <div className="space-y-3 sm:space-y-4 w-full max-w-full lg:max-w-7xl mx-auto pb-28 sm:pb-20 min-w-0">
        {/* ========================================================================= */}
        {/* COMPACT TOP BAR: Back link, Inline Title, Badges, Autosave, Desktop Actions */}
        {/* (Eliminates the giant separate title card!)                              */}
        {/* ========================================================================= */}
        <div className="p-3 sm:p-3.5 rounded-2xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xs flex flex-wrap lg:flex-nowrap items-center justify-between gap-3 min-w-0 w-full max-w-full depth-surface">
          {/* Left: Back Link & Inline Editable Title */}
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <Link
              href={patientContext ? patientContext.returnToUrl : `/consultoria/${slug}/planos-v2`}
              className="p-1.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors shrink-0"
              title={patientContext ? `Voltar para ${patientContext.studentName}` : "Voltar para Planos"}
            >
              <ArrowLeftIcon className="w-4 h-4" />
            </Link>

            {/* Title / Inline Title Edit */}
            <div className="min-w-0 flex-1 flex items-center gap-2 flex-wrap">
              {isEditingTitle ? (
                <div className="flex items-center gap-1.5 flex-1 max-w-md">
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveMetadata();
                      if (e.key === "Escape") setIsEditingTitle(false);
                    }}
                    className="w-full px-2.5 py-1 text-sm font-bold rounded-lg border border-[var(--brand)] bg-[var(--surface)] text-[var(--text-primary)] focus:outline-none"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => handleSaveMetadata()}
                    className="px-2.5 py-1 text-xs font-bold rounded-lg bg-[var(--brand)] text-white hover:opacity-90 cursor-pointer shrink-0"
                  >
                    Salvar
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingTitle(false)}
                    className="px-2 py-1 text-xs rounded-lg border border-[var(--border)] text-[var(--text-secondary)] cursor-pointer shrink-0"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 min-w-0 group">
                  <h1
                    onClick={() => !isReadOnly && setIsEditingTitle(true)}
                    className={`text-sm sm:text-base font-extrabold text-[var(--text-primary)] truncate ${
                      !isReadOnly ? "cursor-pointer hover:text-[var(--brand)] transition-colors" : ""
                    }`}
                    title={tree.version.title}
                  >
                    {tree.version.title}
                  </h1>
                  {!isReadOnly && (
                    <button
                      type="button"
                      onClick={() => setIsEditingTitle(true)}
                      className="p-1 text-[var(--text-muted)] hover:text-[var(--brand)] rounded transition-colors opacity-70 group-hover:opacity-100 cursor-pointer"
                      title="Editar título"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                  )}
                </div>
              )}

              {/* Version & Status Badges */}
              <Badge
                variant={
                  tree.version.status === "PUBLISHED"
                    ? "success"
                    : tree.version.status === "DRAFT"
                    ? "warning"
                    : "neutral"
                }
                size="sm"
              >
                {tree.version.status === "DRAFT"
                  ? `Rascunho V${tree.version.versionNumber}`
                  : tree.version.status === "PUBLISHED"
                  ? `V${tree.version.versionNumber}`
                  : `Arquivada V${tree.version.versionNumber}`}
              </Badge>

              {patientContext && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--brand)]/10 text-[var(--brand)] border border-[var(--brand)]/20 truncate max-w-[150px]">
                  {patientContext.studentName}
                </span>
              )}

              <AutosaveIndicator status={autosaveStatus} errorMessage={autosaveError} />
            </div>
          </div>

          {/* Right: Desktop Action Controls */}
          <div className="hidden lg:flex items-center gap-2 shrink-0">
            {/* Patient Preview Button */}
            {preferences.showStudentPreview && (
              <button
                type="button"
                onClick={() => setIsPreviewOpen(true)}
                className="px-3 py-1.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5 shadow-2xs transition-colors depth-interactive min-h-[34px] cursor-pointer"
                title="Visualizar prévia como o aluno verá no smartphone"
              >
                <EyeIcon className="w-3.5 h-3.5 text-[var(--brand)]" />
                <span>Prévia do Aluno</span>
              </button>
            )}

            {/* Version History Button */}
            {preferences.showVersionHistory && (
              <button
                type="button"
                onClick={handleOpenHistory}
                className="px-3 py-1.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5 shadow-2xs transition-colors depth-interactive min-h-[34px] cursor-pointer"
              >
                <HistoryIcon className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                <span>Histórico</span>
              </button>
            )}

            {/* PDF Button */}
            <a
              href={`/api/consultancies/${slug}/nutricao/pdf?planPublicId=${initialTree.plan.publicId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5 shadow-2xs transition-colors depth-interactive min-h-[34px]"
              title="Baixar plano alimentar em PDF oficial"
            >
              <svg className="w-3.5 h-3.5 text-[var(--brand)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>PDF</span>
            </a>

            {/* Save as Template */}
            {preferences.showTemplateActions && (
              <button
                type="button"
                onClick={() => setIsSaveTemplateDialogOpen(true)}
                className="px-3 py-1.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5 shadow-2xs transition-colors depth-interactive min-h-[34px] cursor-pointer"
                title="Salvar estrutura deste plano como modelo reutilizável"
              >
                <svg className="w-3.5 h-3.5 text-[var(--text-secondary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
                <span>Modelo</span>
              </button>
            )}

            {/* Panel View Preferences Trigger */}
            <button
              type="button"
              onClick={() => setIsPreferencesOpen(true)}
              className="p-1.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors min-h-[34px] min-w-[34px] flex items-center justify-center cursor-pointer shadow-2xs depth-interactive"
              title="Preferências do painel"
              aria-label="Preferências do painel"
            >
              <SettingsIcon className="w-4 h-4" />
            </button>

            {/* Publish / Prescribe Buttons */}
            {tree.version.status === "DRAFT" && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setPublishError(null);
                  setIsPublishDialogOpen(true);
                }}
                className="font-bold min-h-[34px] shadow-sm text-xs"
              >
                <CheckIcon className="w-3.5 h-3.5 mr-1" />
                <span>{patientContext ? "Publicar atualização" : "Publicar Versão"}</span>
              </Button>
            )}

            {tree.version.status === "PUBLISHED" && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsAssignModalOpen(true)}
                className="font-bold min-h-[34px] shadow-sm text-xs"
              >
                <UserPlusIcon className="w-3.5 h-3.5 mr-1" />
                <span>Prescrever ao Aluno{assignments.length > 0 ? ` (${assignments.length})` : ""}</span>
              </Button>
            )}

            {tree.version.status !== "DRAFT" && (
              <Button
                variant="primary"
                size="sm"
                disabled={isCreatingVersion}
                onClick={handleCreateNextVersion}
                className="font-bold min-h-[34px] shadow-sm text-xs"
              >
                <PlusIcon className="w-3.5 h-3.5 mr-1" />
                <span>{isCreatingVersion ? "Criando..." : "Nova Versão"}</span>
              </Button>
            )}
          </div>
        </div>

        {/* Origin Banner (compact) */}
        {origin === "template" && (
          <div className="px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
            <span className="font-bold shrink-0">Origem:</span>
            <span>Criado a partir do modelo: <strong>{originName || "Modelo"}</strong></span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* CRISP TABS: Montagem, Análise, Orientações                                */}
        {/* ========================================================================= */}
        <div className="border-b border-[var(--border-default)] flex items-center gap-1 sm:gap-2">
          {[
            { id: "BUILDER", label: "Montagem" },
            { id: "ANALYSIS", label: "Análise" },
            { id: "GUIDANCE", label: "Orientações" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-bold border-b-2 transition-colors cursor-pointer ${
                activeTab === tab.id
                  ? "border-[var(--brand)] text-[var(--brand)]"
                  : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: MONTAGEM (BUILDER)                                                 */}
        {/* ========================================================================= */}
        {activeTab === "BUILDER" && (
          <div className="space-y-3 sm:space-y-4">
            {/* Days / Menus Selector Bar with Quick Meal Jump & Expand All */}
            <div className="p-2 sm:p-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border-default)] shadow-2xs flex items-center justify-between gap-2 overflow-x-auto scrollbar-none flex-wrap sm:flex-nowrap">
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedDayTab("ALL_DAYS")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    selectedDayTab === "ALL_DAYS"
                      ? "bg-[var(--brand)] text-white shadow-2xs"
                      : "bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
                  }`}
                >
                  Todos os dias
                </button>

                {/* Quick Meal Jump Dropdown */}
                {tree.meals.length > 0 && (
                  <select
                    onChange={(e) => {
                      if (!e.target.value) return;
                      const el = document.getElementById(e.target.value);
                      el?.scrollIntoView({ behavior: "smooth", block: "center" });
                    }}
                    defaultValue=""
                    className="px-2.5 py-1.5 text-xs rounded-lg border border-[var(--border-default)] bg-[var(--surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)] cursor-pointer"
                  >
                    <option value="" disabled>Ir para refeição...</option>
                    {tree.meals.map((m) => (
                      <option key={m.publicId} value={`meal-${m.publicId}`}>
                        {m.title} ({m.mealTotals.caloriesKcal} kcal)
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs shrink-0">
                {/* Expand / Collapse All Toggle */}
                {tree.meals.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setAllMealsCollapsed((prev) => !prev)}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-[var(--border-default)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                  >
                    {allMealsCollapsed ? "Expandir todas" : "Recolher todas"}
                  </button>
                )}
                <span className="text-[var(--text-tertiary)] hidden md:inline">
                  {tree.meals.length} refeição{tree.meals.length === 1 ? "" : "ões"}
                </span>
              </div>
            </div>

            {/* 2-Column Responsive Workspace: Left 8/12 Builder, Right 4/12 Sticky Cockpit */}
            <div className="flex flex-col lg:grid lg:grid-cols-12 gap-5 items-start w-full max-w-full min-w-0">
              {/* LEFT / MAIN WORKSPACE: Meals List */}
              <div className="lg:col-span-8 space-y-3.5 w-full max-w-full min-w-0">
                {/* Add Meal Top Row */}
                {!isReadOnly && !isAddingMeal && (
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-sm sm:text-base font-bold text-[var(--text-primary)]">
                      Refeições do Plano
                    </h2>
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={() => setIsAddingMeal(true)}
                      className="font-bold min-h-[34px] shadow-sm text-xs"
                    >
                      <PlusIcon className="w-3.5 h-3.5 mr-1" />
                      <span>Nova Refeição</span>
                    </Button>
                  </div>
                )}

                {/* Add Meal Form */}
                {!isReadOnly && isAddingMeal && (
                  <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--brand)]/40 shadow-sm space-y-3 depth-surface animate-in fade-in duration-150">
                    <h3 className="text-xs sm:text-sm font-bold text-[var(--text-primary)]">Nova Refeição</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                          Nome da refeição *
                        </label>
                        <input
                          type="text"
                          value={newMealTitle}
                          onChange={(e) => setNewMealTitle(e.target.value)}
                          placeholder="Ex: Café da manhã, Almoço, Lanche da tarde..."
                          className="w-full px-3 py-1.5 text-xs sm:text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                          Horário (opcional)
                        </label>
                        <input
                          type="time"
                          value={newMealTime}
                          onChange={(e) => setNewMealTime(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs sm:text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)]"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                        Observações (opcional)
                      </label>
                      <input
                        type="text"
                        value={newMealNotes}
                        onChange={(e) => setNewMealNotes(e.target.value)}
                        placeholder="Ex: Tomar logo ao acordar com água morna..."
                        className="w-full px-3 py-1.5 text-xs sm:text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)]"
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-1 border-t border-[var(--border-subtle)]">
                      <Button type="button" variant="secondary" size="sm" onClick={() => setIsAddingMeal(false)}>
                        Cancelar
                      </Button>
                      <Button type="button" variant="primary" size="sm" onClick={handleCreateMeal}>
                        Criar Refeição
                      </Button>
                    </div>
                  </div>
                )}

                {/* Empty State */}
                {tree.meals.length === 0 && !isAddingMeal && (
                  <div className="text-center py-14 px-4 bg-[var(--surface)] border border-dashed border-[var(--border-default)] rounded-xl space-y-3 depth-surface">
                    <div className="w-12 h-12 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-[var(--brand)] flex items-center justify-center mx-auto shadow-2xs">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    </div>
                    <h3 className="text-base font-bold text-[var(--text-primary)]">
                      {isReadOnly ? "Nenhuma refeição cadastrada" : "Adicione a primeira refeição"}
                    </h3>
                    <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto">
                      {isReadOnly
                        ? "Esta versão não possui refeições cadastradas."
                        : "Estruture as refeições diárias e adicione alimentos com porções e substituições equivalentes."}
                    </p>
                    {!isReadOnly && (
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        onClick={() => setIsAddingMeal(true)}
                        className="font-bold min-h-[38px] shadow-sm inline-flex items-center gap-1.5"
                      >
                        <PlusIcon className="w-4 h-4 mr-1" />
                        <span>Criar Primeira Refeição</span>
                      </Button>
                    )}
                  </div>
                )}

                {/* Meals Render List */}
                {tree.meals.length > 0 && (
                  <div className="space-y-3">
                    {tree.meals.map((meal, idx) => (
                      <NutritionMealEditor
                        key={meal.publicId}
                        slug={slug}
                        meal={meal}
                        readOnly={isReadOnly}
                        isFirst={idx === 0}
                        isLast={idx === tree.meals.length - 1}
                        forceCollapsed={allMealsCollapsed}
                        onMoveUp={() => handleMoveMeal(idx, "UP")}
                        onMoveDown={() => handleMoveMeal(idx, "DOWN")}
                        onDuplicateMeal={() => handleDuplicateMeal(meal)}
                        onUpdateMeal={async (data) => {
                          setAutosaveStatus("saving");
                          const res = await updateMealAction(slug, tree.plan.publicId, meal.publicId, data);
                          if (res.success) {
                            await refreshTree();
                            setAutosaveStatus("saved");
                            setTimeout(() => setAutosaveStatus("idle"), 3000);
                          } else {
                            setAutosaveStatus("error");
                            alert(res.error || "Erro ao atualizar refeição.");
                          }
                        }}
                        onRemoveMeal={async () => {
                          setAutosaveStatus("saving");
                          const res = await removeMealAction(slug, tree.plan.publicId, meal.publicId);
                          if (res.success) {
                            await refreshTree();
                            setAutosaveStatus("saved");
                            setTimeout(() => setAutosaveStatus("idle"), 3000);
                          } else {
                            setAutosaveStatus("error");
                            alert(res.error || "Erro ao remover refeição.");
                          }
                        }}
                        onAddItem={async (payload: FoodSelectionResult) => {
                          setAutosaveStatus("saving");
                          const res = await addMealItemAction(slug, tree.plan.publicId, meal.publicId, payload);
                          if (res.success) {
                            await refreshTree();
                            setAutosaveStatus("saved");
                            setTimeout(() => setAutosaveStatus("idle"), 3000);
                          } else {
                            setAutosaveStatus("error");
                            throw new Error(res.error || "Erro ao adicionar alimento.");
                          }
                        }}
                        onUpdateItem={async (itemPublicId, data) => {
                          setAutosaveStatus("saving");
                          const res = await updateMealItemAction(slug, tree.plan.publicId, itemPublicId, data);
                          if (res.success) {
                            await refreshTree();
                            setAutosaveStatus("saved");
                            setTimeout(() => setAutosaveStatus("idle"), 3000);
                          } else {
                            setAutosaveStatus("error");
                            alert(res.error || "Erro ao atualizar item.");
                          }
                        }}
                        onRemoveItem={(itemPublicId) => handleRemoveItemWithUndo(meal.publicId, itemPublicId)}
                        onReorderItems={async (orderedItemPublicIds) => {
                          setAutosaveStatus("saving");
                          const res = await reorderMealItemsAction(slug, tree.plan.publicId, meal.publicId, orderedItemPublicIds);
                          if (res.success) {
                            await refreshTree();
                            setAutosaveStatus("saved");
                            setTimeout(() => setAutosaveStatus("idle"), 3000);
                          } else {
                            setAutosaveStatus("error");
                            alert(res.error || "Erro ao reordenar itens.");
                          }
                        }}
                        onAddSubstitution={async (itemPublicId, payload: AddSubstitutionInput) => {
                          setAutosaveStatus("saving");
                          const res = await addSubstitutionAction(slug, tree.plan.publicId, itemPublicId, payload);
                          if (res.success) {
                            await refreshTree();
                            setAutosaveStatus("saved");
                            setTimeout(() => setAutosaveStatus("idle"), 3000);
                          } else {
                            setAutosaveStatus("error");
                            alert(res.error || "Erro ao adicionar substituição.");
                          }
                        }}
                        onUpdateSubstitution={async (subPublicId, data) => {
                          setAutosaveStatus("saving");
                          const res = await updateSubstitutionAction(slug, tree.plan.publicId, subPublicId, data);
                          if (res.success) {
                            await refreshTree();
                            setAutosaveStatus("saved");
                            setTimeout(() => setAutosaveStatus("idle"), 3000);
                          } else {
                            setAutosaveStatus("error");
                            throw new Error(res.error || "Erro ao atualizar substituição.");
                          }
                        }}
                        onRemoveSubstitution={async (subPublicId) => {
                          setAutosaveStatus("saving");
                          const res = await removeSubstitutionAction(slug, tree.plan.publicId, subPublicId);
                          if (res.success) {
                            await refreshTree();
                            setAutosaveStatus("saved");
                            setTimeout(() => setAutosaveStatus("idle"), 3000);
                          } else {
                            setAutosaveStatus("error");
                            alert(res.error || "Erro ao remover substituição.");
                          }
                        }}
                        onReorderSubstitutions={async (itemPublicId, orderedSubs) => {
                          setAutosaveStatus("saving");
                          const res = await reorderSubstitutionsAction(slug, tree.plan.publicId, itemPublicId, orderedSubs);
                          if (res.success) {
                            await refreshTree();
                            setAutosaveStatus("saved");
                            setTimeout(() => setAutosaveStatus("idle"), 3000);
                          } else {
                            setAutosaveStatus("error");
                            alert(res.error || "Erro ao reordenar substituições.");
                          }
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* ========================================================================= */}
              {/* RIGHT / STICKY COCKPIT: Nutritional Summary (Total do Cardápio vs Meta)    */}
              {/* (Corrected labels: Total vs Meta, no misleading 66.5 kcal meta label)     */}
              {/* ========================================================================= */}
              <div className="w-full lg:col-span-4 lg:sticky lg:top-4 space-y-3.5">
                <div className="p-4 sm:p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xs space-y-4 depth-surface">
                  {/* Energy Header */}
                  <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] block">
                          Total do Cardápio
                        </span>
                        {tree.dailyTotals.hasIncompleteData && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            Subtotal parcial
                          </span>
                        )}
                      </div>
                      <div className="text-xl sm:text-2xl font-extrabold text-[var(--brand)] font-heading leading-tight mt-0.5">
                        {tree.dailyTotals.caloriesKcal.toLocaleString("pt-BR")}{" "}
                        <span className="text-xs font-semibold text-[var(--text-secondary)]">kcal</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] block">
                        Meta Clínica
                      </span>
                      <div className="text-xs sm:text-sm font-semibold text-[var(--text-secondary)] mt-0.5">
                        {planningTarget?.caloriesKcal ? (
                          <span className="font-bold text-[var(--text-primary)]">{planningTarget.caloriesKcal} kcal</span>
                        ) : (
                          <span className="text-[var(--text-muted)] italic">Não definida</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {tree.dailyTotals.hasIncompleteData && (
                    <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs flex items-start gap-2">
                      <span className="text-sm shrink-0">⚠️</span>
                      <div className="space-y-0.5">
                        <p className="font-semibold text-[11px]">Subtotal calculado — dados incompletos</p>
                        <p className="text-[11px] text-amber-700 dark:text-amber-400/90 leading-relaxed">
                          {tree.dailyTotals.incompleteItemsCount}{" "}
                          {tree.dailyTotals.incompleteItemsCount === 1 ? "alimento precisa" : "alimentos precisam"} de
                          vínculo ou medida caseira para fechar as calorias exatas.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Calories Progress Bar only if planningTarget?.caloriesKcal exists */}
                  {planningTarget?.caloriesKcal ? (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-[var(--text-secondary)]">
                        <span>Atingimento da Meta:</span>
                        <span className="font-bold text-[var(--text-primary)]">
                          {Math.round((tree.dailyTotals.caloriesKcal / planningTarget.caloriesKcal) * 100)}%
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-[var(--surface-subtle)] overflow-hidden">
                        <div
                          className="h-full bg-[var(--brand)] rounded-full transition-all duration-300"
                          style={{
                            width: `${Math.min(100, Math.round((tree.dailyTotals.caloriesKcal / planningTarget.caloriesKcal) * 100))}%`,
                          }}
                        />
                      </div>
                    </div>
                  ) : null}

                  {/* Macronutrient VET % Segmented Bar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] uppercase font-bold tracking-wider text-[var(--text-tertiary)]">
                      <span>Distribuição Calórica (% VET)</span>
                      <span className="text-[9px] font-normal normal-case text-[var(--text-muted)]">Valor Energético Total</span>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-[var(--surface-subtle)] flex overflow-hidden">
                      <div style={{ width: `${pPct}%` }} className="bg-sky-500 h-full" title={`Proteína: ${pPct}%`} />
                      <div style={{ width: `${cPct}%` }} className="bg-emerald-500 h-full" title={`Carboidratos: ${cPct}%`} />
                      <div style={{ width: `${fPct}%` }} className="bg-amber-500 h-full" title={`Gorduras: ${fPct}%`} />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-[var(--text-secondary)] font-medium pt-0.5">
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-sky-500 shrink-0" />
                        P: {pPct}%
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                        C: {cPct}%
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                        G: {fPct}%
                      </span>
                    </div>
                  </div>

                  {/* Macro Cards */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 sm:p-2.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-0.5">
                      <span className="text-[10px] uppercase font-bold text-sky-600 dark:text-sky-400 block truncate">
                        Proteínas
                      </span>
                      <span className="text-sm font-extrabold text-[var(--text-primary)] block tabular-nums">
                        {tree.dailyTotals.proteinG}g
                      </span>
                      {planningTarget?.proteinG && (
                        <span className="text-[9px] text-[var(--text-tertiary)] block">
                          Meta: {planningTarget.proteinG}g
                        </span>
                      )}
                    </div>
                    <div className="p-2 sm:p-2.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-0.5">
                      <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 block truncate">
                        Carboidratos
                      </span>
                      <span className="text-sm font-extrabold text-[var(--text-primary)] block tabular-nums">
                        {tree.dailyTotals.carbohydrateG}g
                      </span>
                      {planningTarget?.carbsG && (
                        <span className="text-[9px] text-[var(--text-tertiary)] block">
                          Meta: {planningTarget.carbsG}g
                        </span>
                      )}
                    </div>
                    <div className="p-2 sm:p-2.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-0.5">
                      <span className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400 block truncate">
                        Gorduras
                      </span>
                      <span className="text-sm font-extrabold text-[var(--text-primary)] block tabular-nums">
                        {tree.dailyTotals.fatG}g
                      </span>
                      {planningTarget?.fatsG && (
                        <span className="text-[9px] text-[var(--text-tertiary)] block">
                          Meta: {planningTarget.fatsG}g
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Fiber Row */}
                  {tree.dailyMicronutrientTotals?.nutrients?.FIBER && (
                    <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-[var(--surface-subtle)] text-xs border border-[var(--border-subtle)]">
                      <span className="text-[var(--text-secondary)] font-medium">Fibras Alimentares</span>
                      <span className="font-bold text-[var(--text-primary)]">
                        {tree.dailyMicronutrientTotals.nutrients.FIBER.value} g
                      </span>
                    </div>
                  )}

                  {/* Caloric Distribution per Meal */}
                  {tree.meals.length > 0 && totalKcal > 0 && (
                    <div className="space-y-1.5 pt-1 border-t border-[var(--border-subtle)]">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-tertiary)] block">
                        Distribuição por Refeição
                      </span>
                      <div className="space-y-1 text-xs">
                        {tree.meals.map((m) => {
                          const mealPct = Math.round(((m.mealTotals.caloriesKcal || 0) / totalKcal) * 100);
                          return (
                            <div key={m.publicId} className="flex items-center justify-between text-[11px]">
                              <span className="text-[var(--text-secondary)] truncate max-w-[150px]">
                                {m.title}
                              </span>
                              <span className="font-semibold text-[var(--text-primary)] shrink-0">
                                {m.mealTotals.caloriesKcal} kcal ({mealPct}%)
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Micronutrients Trigger */}
                  <button
                    type="button"
                    onClick={() => setIsMicronutrientsDrawerOpen(true)}
                    className="w-full inline-flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] border border-[var(--border-default)] text-xs font-bold text-[var(--text-primary)] transition-all cursor-pointer min-h-[36px]"
                  >
                    <svg className="w-3.5 h-3.5 text-[var(--brand)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
                    <span>Ver micronutrientes detalhados</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: ANÁLISE NUTRICIONAL (DEEP DIVE)                                    */}
        {/* ========================================================================= */}
        {activeTab === "ANALYSIS" && (
          <div className="p-4 sm:p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xs space-y-6 depth-surface">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">
                Análise Nutricional Completa do Plano
              </h2>
              <p className="text-xs text-[var(--text-secondary)]">
                Quadro comparativo de macronutrientes, distribuição energética (% VET) e micronutrientes.
              </p>
            </div>

            {/* Macro Summary Matrix */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-[var(--brand)]/10 border border-[var(--brand)]/20">
                <span className="text-xs text-[var(--text-secondary)] block">Valor Energético Total</span>
                <span className="text-xl font-extrabold text-[var(--brand)]">
                  {formatCaloriesKcal(tree.dailyTotals.caloriesKcal)}
                </span>
                {planningTarget?.caloriesKcal && (
                  <span className="text-[11px] text-[var(--text-tertiary)] block mt-1">
                    Meta clínica: {planningTarget.caloriesKcal} kcal
                  </span>
                )}
              </div>
              <div className="p-3.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
                <span className="text-xs text-[var(--text-secondary)] block">Proteínas Totais</span>
                <span className="text-xl font-bold text-[var(--text-primary)]">
                  {formatMacroGram(tree.dailyTotals.proteinG)}
                </span>
                <span className="text-[11px] text-sky-600 dark:text-sky-400 block mt-1">
                  {pPct}% do VET
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
                <span className="text-xs text-[var(--text-secondary)] block">Carboidratos Totais</span>
                <span className="text-xl font-bold text-[var(--text-primary)]">
                  {formatMacroGram(tree.dailyTotals.carbohydrateG)}
                </span>
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 block mt-1">
                  {cPct}% do VET
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
                <span className="text-xs text-[var(--text-secondary)] block">Lipídios Totais</span>
                <span className="text-xl font-bold text-[var(--text-primary)]">
                  {formatMacroGram(tree.dailyTotals.fatG)}
                </span>
                <span className="text-[11px] text-amber-600 dark:text-amber-400 block mt-1">
                  {fPct}% do VET
                </span>
              </div>
            </div>

            {/* Meal-by-Meal Table */}
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                Quadro por Refeição
              </h3>
              <div className="overflow-x-auto rounded-xl border border-[var(--border-default)]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[var(--surface-subtle)] text-[var(--text-secondary)] border-b border-[var(--border-default)] font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Refeição</th>
                      <th className="py-2.5 px-3">Horário</th>
                      <th className="py-2.5 px-3 text-right">Calorias (kcal)</th>
                      <th className="py-2.5 px-3 text-right">Proteínas (g)</th>
                      <th className="py-2.5 px-3 text-right">Carboidratos (g)</th>
                      <th className="py-2.5 px-3 text-right">Gorduras (g)</th>
                      <th className="py-2.5 px-3 text-right">% do Dia</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-subtle)]">
                    {tree.meals.map((m) => {
                      const mealPct = totalKcal > 0 ? Math.round(((m.mealTotals.caloriesKcal || 0) / totalKcal) * 100) : 0;
                      return (
                        <tr key={m.publicId} className="hover:bg-[var(--surface-hover)]">
                          <td className="py-2 px-3 font-semibold text-[var(--text-primary)]">{m.title}</td>
                          <td className="py-2 px-3 text-[var(--text-secondary)]">{m.scheduledTime || "—"}</td>
                          <td className="py-2 px-3 text-right font-bold text-[var(--brand)]">{m.mealTotals.caloriesKcal}</td>
                          <td className="py-2 px-3 text-right text-[var(--text-primary)]">{m.mealTotals.proteinG}g</td>
                          <td className="py-2 px-3 text-right text-[var(--text-primary)]">{m.mealTotals.carbohydrateG}g</td>
                          <td className="py-2 px-3 text-right text-[var(--text-primary)]">{m.mealTotals.fatG}g</td>
                          <td className="py-2 px-3 text-right text-[var(--text-secondary)]">{mealPct}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* In-page Micronutrients */}
            {tree.dailyMicronutrientTotals && (
              <div className="pt-2">
                <NutritionMicronutrientsPanel
                  totals={tree.dailyMicronutrientTotals}
                  title="Micronutrientes do Plano (Minerais e Vitaminas)"
                  defaultCollapsed={false}
                />
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: ORIENTAÇÕES E RECOMENDAÇÕES                                       */}
        {/* ========================================================================= */}
        {activeTab === "GUIDANCE" && (
          <div className="p-4 sm:p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xs space-y-4 depth-surface">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">
                Orientações Clínicas e Recomendações
              </h2>
              <p className="text-xs text-[var(--text-secondary)]">
                Instruções personalizadas, recomendações hídricas e notas que o paciente visualiza no app.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[var(--text-primary)] mb-1.5">
                  Orientações Gerais do Nutricionista
                </label>
                <textarea
                  rows={6}
                  value={generalGuidance}
                  onChange={(e) => setGeneralGuidance(e.target.value)}
                  placeholder="Ex: Ingerir de 2,5 a 3 litros de água diariamente. Evitar frituras e açúcares refinados. Priorizar consumo de vegetais nas duas principais refeições..."
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)] resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-primary)] mb-1.5">
                  Notas Clínicas Internas (Visíveis apenas para a equipe)
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: Paciente relata desconforto com lactose. Acompanhar adesão na próxima semana..."
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)] resize-none"
                />
              </div>

              {!isReadOnly && (
                <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border-subtle)]">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleSaveMetadata()}
                    className="font-bold min-h-[36px] shadow-sm text-xs"
                  >
                    Salvar Orientações
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* FLOATING UNDO TOAST                                                       */}
        {/* ========================================================================= */}
        {deletedItemUndo && (
          <div className="fixed bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl bg-zinc-950 text-white shadow-2xl flex items-center gap-3 text-xs border border-zinc-800 animate-in slide-in-from-bottom duration-200">
            <span className="truncate max-w-[200px] sm:max-w-xs font-medium">
              Alimento &ldquo;{deletedItemUndo.item.foodNameSnapshot}&rdquo; removido.
            </span>
            <button
              type="button"
              onClick={handleUndoRemoveItem}
              className="px-2.5 py-1 rounded-lg bg-[var(--brand)] text-white font-bold hover:opacity-90 transition-opacity cursor-pointer shadow-xs shrink-0"
            >
              Desfazer
            </button>
            <button
              type="button"
              onClick={() => setDeletedItemUndo(null)}
              className="text-zinc-400 hover:text-white shrink-0 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODALS & DRAWERS                                                          */}
        {/* ========================================================================= */}

        {/* Patient Preview Modal */}
        <NutritionPatientPreviewModal
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          tree={tree}
          studentName={patientContext?.studentName}
        />

        {/* Micronutrients Drawer */}
        {tree.dailyMicronutrientTotals && (
          <NutritionMicronutrientsPanel
            totals={tree.dailyMicronutrientTotals}
            title="Micronutrientes do Plano"
            isDrawer={true}
            isOpen={isMicronutrientsDrawerOpen}
            onClose={() => setIsMicronutrientsDrawerOpen(false)}
          />
        )}

        {/* Save as Template Dialog */}
        <NutritionSaveTemplateDialog
          isOpen={isSaveTemplateDialogOpen}
          onClose={() => setIsSaveTemplateDialogOpen(false)}
          consultancySlug={slug}
          planPublicId={tree.plan.publicId}
          versionPublicId={tree.version.publicId}
          defaultName={tree.version.title}
        />

        {/* Publish Dialog */}
        <NutritionPublishDialog
          isOpen={isPublishDialogOpen}
          onClose={() => setIsPublishDialogOpen(false)}
          onConfirm={handleConfirmPublish}
          tree={tree}
          isPublishing={isPublishing}
          errorMessage={publishError}
          patientName={patientContext?.studentName}
          onReviewItem={handleReviewPublicationItem}
        />

        {/* Version History Drawer */}
        <NutritionVersionHistory
          slug={slug}
          planPublicId={tree.plan.publicId}
          currentVersionPublicId={tree.version.publicId}
          versions={historyItems}
          isOpen={isHistoryOpen}
          isLoading={isLoadingHistory}
          onClose={() => setIsHistoryOpen(false)}
        />

        {/* Prescribe Modal */}
        <NutritionAssignModal
          slug={slug}
          planPublicId={tree.plan.publicId}
          planTitle={tree.version.title}
          versionPublicId={tree.version.publicId}
          versionNumber={tree.version.versionNumber}
          isOpen={isAssignModalOpen}
          onClose={() => setIsAssignModalOpen(false)}
          onSuccess={refreshAssignments}
        />
      </div>

      {/* ========================================================================= */}
      {/* MOBILE STICKY BOTTOM ACTION BAR                                           */}
      {/* ========================================================================= */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-[var(--surface)]/95 backdrop-blur-md border-t border-[var(--border-default)] p-2.5 pb-[calc(0.6rem+env(safe-area-inset-bottom,0px))] shadow-lg flex items-center justify-between gap-2 w-full max-w-full min-w-0">
        <button
          type="button"
          aria-label="Mais ações do plano"
          onClick={() => setIsMobileActionSheetOpen(true)}
          className="min-h-[44px] min-w-[44px] rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] active:scale-95 text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center shrink-0 cursor-pointer"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="1" />
            <circle cx="12" cy="5" r="1" />
            <circle cx="12" cy="19" r="1" />
          </svg>
        </button>

        {/* Preview Button Mobile */}
        {preferences.showStudentPreview && (
          <button
            type="button"
            onClick={() => setIsPreviewOpen(true)}
            className="min-h-[44px] px-3 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <EyeIcon className="w-3.5 h-3.5 text-[var(--brand)]" />
            <span>Prévia</span>
          </button>
        )}

        {tree.version.status === "DRAFT" && (
          <Button
            variant="primary"
            size="md"
            onClick={() => {
              setPublishError(null);
              setIsPublishDialogOpen(true);
            }}
            className="flex-1 font-bold min-h-[44px] shadow-sm flex items-center justify-center gap-1.5 text-xs sm:text-sm"
          >
            <CheckIcon className="w-4 h-4" />
            <span>{patientContext ? "Publicar atualização" : "Publicar"}</span>
          </Button>
        )}

        {tree.version.status === "PUBLISHED" && (
          <Button
            variant="primary"
            size="md"
            onClick={() => setIsAssignModalOpen(true)}
            className="flex-1 font-bold min-h-[44px] shadow-sm flex items-center justify-center gap-1.5 text-xs sm:text-sm"
          >
            <UserPlusIcon className="w-4 h-4" />
            <span>Prescrever{assignments.length > 0 ? ` (${assignments.length})` : ""}</span>
          </Button>
        )}
      </div>

      {/* Mobile Action Sheet */}
      <MobileActionSheet
        isOpen={isMobileActionSheetOpen}
        onClose={() => setIsMobileActionSheetOpen(false)}
        title={tree.version.title}
        options={[
          ...(preferences.showStudentPreview ? [{
            id: "preview",
            label: "Prévia do Aluno (Smartphone)",
            icon: <EyeIcon className="w-4 h-4 text-[var(--brand)]" />,
            onClick: () => setIsPreviewOpen(true),
          }] : []),
          ...(tree.version.status === "DRAFT" && patientContext ? [{
            id: "discard-draft",
            label: "Descartar alterações",
            icon: (
              <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            ),
            variant: "danger" as const,
            disabled: isDiscarding,
            onClick: handleDiscardDraft,
          }] : []),
          ...(!isReadOnly ? [{
            id: "add-meal",
            label: "Adicionar Refeição",
            icon: <PlusIcon className="w-4 h-4 text-[var(--brand)]" />,
            onClick: () => {
              setActiveTab("BUILDER");
              setIsAddingMeal(true);
            },
          }, {
            id: "edit-meta",
            label: "Editar Título do Plano",
            icon: (
              <svg className="w-4 h-4 text-[var(--brand)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            ),
            onClick: () => setIsEditingTitle(true),
          }] : []),
          ...(preferences.showVersionHistory ? [{
            id: "history",
            label: "Histórico de Versões",
            icon: <HistoryIcon className="w-4 h-4 text-[var(--text-secondary)]" />,
            onClick: () => handleOpenHistory(),
          }] : []),
          {
            id: "pdf",
            label: "Baixar plano em PDF",
            icon: (
              <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            ),
            onClick: () => {
              window.open(`/api/consultancies/${slug}/nutricao/pdf?planPublicId=${initialTree.plan.publicId}`, "_blank");
            },
          },
          ...(preferences.showTemplateActions ? [{
            id: "template",
            label: "Salvar como modelo",
            icon: (
              <svg className="w-4 h-4 text-[var(--text-secondary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            ),
            onClick: () => setIsSaveTemplateDialogOpen(true),
          }] : []),
          {
            id: "preferences",
            label: "Preferências do painel",
            icon: <SettingsIcon className="w-4 h-4 text-[var(--brand)]" />,
            onClick: () => setIsPreferencesOpen(true),
          },
        ]}
      />

      {/* Panel Preferences Drawer */}
      <NutritionBuilderPreferencesDrawer
        isOpen={isPreferencesOpen}
        onClose={() => setIsPreferencesOpen(false)}
        slug={slug}
        preferences={preferences}
        onSaved={(newPrefs) => setPreferences(newPrefs)}
      />
    </div>
  );
}
