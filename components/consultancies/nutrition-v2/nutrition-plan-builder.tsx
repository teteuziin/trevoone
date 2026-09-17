"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { PlanVersionTreeDto, PlanVersionHistoryItemDto } from "@/lib/nutrition-v2/plan-repository";
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
  createNextVersionAction,
  getPlanVersionHistoryAction,
  listPlanAssignmentsAction,
} from "@/app/consultoria/[slug]/planos-v2/actions";
import { NutritionMealEditor } from "./nutrition-meal-editor";
import { NutritionPublishDialog } from "./nutrition-publish-dialog";
import { NutritionVersionHistory } from "./nutrition-version-history";
import { NutritionAssignModal } from "./nutrition-assign-modal";
import { NutritionAssignmentsList } from "./nutrition-assignments-list";
import type { AssignmentListItemDto } from "@/lib/nutrition-v2/assignment-repository";
import type { FoodSelectionResult } from "./nutrition-food-picker";

interface NutritionPlanBuilderProps {
  slug: string;
  initialTree: PlanVersionTreeDto;
  initialAssignments?: AssignmentListItemDto[];
}

function ArrowLeftIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  );
}

function HistoryIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function CheckIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function UserPlusIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <line x1="20" y1="8" x2="20" y2="14" />
      <line x1="23" y1="11" x2="17" y2="11" />
    </svg>
  );
}

function PlusIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 5v14m-7-7h14" />
    </svg>
  );
}

function EditIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

export function NutritionPlanBuilder({ slug, initialTree, initialAssignments = [] }: NutritionPlanBuilderProps) {
  const router = useRouter();
  const [tree, setTree] = useState<PlanVersionTreeDto>(initialTree);
  const [isPending, startTransition] = useTransition();

  const isReadOnly = tree.version.status !== "DRAFT";

  // Metadata editing state
  const [isEditingMetadata, setIsEditingMetadata] = useState(false);
  const [title, setTitle] = useState(tree.version.title);
  const [subtitle, setSubtitle] = useState(tree.version.subtitle || "");
  const [objective, setObjective] = useState(tree.version.objective || "");
  const [generalGuidance, setGeneralGuidance] = useState(tree.version.generalGuidance || "");
  const [notes, setNotes] = useState(tree.version.notes || "");

  // Add meal state
  const [isAddingMeal, setIsAddingMeal] = useState(false);
  const [newMealTitle, setNewMealTitle] = useState("");
  const [newMealTime, setNewMealTime] = useState("");
  const [newMealNotes, setNewMealNotes] = useState("");

  // Publish Dialog & History Dialog states
  const [isPublishDialogOpen, setIsPublishDialogOpen] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyItems, setHistoryItems] = useState<PlanVersionHistoryItemDto[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // New version state
  const [isCreatingVersion, setIsCreatingVersion] = useState(false);

  // Assignments state
  const [assignments, setAssignments] = useState<AssignmentListItemDto[]>(initialAssignments);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  const refreshAssignments = async () => {
    const res = await listPlanAssignmentsAction(slug, tree.plan.publicId);
    if (res.success && res.data) {
      setAssignments(res.data);
    }
  };

  const refreshTree = async () => {
    window.location.reload();
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

  // 1. Save metadata
  const handleSaveMetadata = async () => {
    if (!title.trim()) {
      alert("O título do plano é obrigatório.");
      return;
    }

    startTransition(async () => {
      const res = await updatePlanMetadataAction(slug, tree.plan.publicId, tree.version.publicId, {
        title: title.trim(),
        subtitle: subtitle.trim() || null,
        objective: objective.trim() || null,
        generalGuidance: generalGuidance.trim() || null,
        notes: notes.trim() || null,
      });

      if (res.success) {
        setIsEditingMetadata(false);
        setTree((prev) => ({
          ...prev,
          version: {
            ...prev.version,
            title: title.trim(),
            subtitle: subtitle.trim() || null,
            objective: objective.trim() || null,
            generalGuidance: generalGuidance.trim() || null,
            notes: notes.trim() || null,
          },
        }));
      } else {
        alert(res.error || "Erro ao salvar dados.");
      }
    });
  };

  // 2. Add meal
  const handleCreateMeal = async () => {
    if (!newMealTitle.trim()) {
      alert("O nome da refeição é obrigatório.");
      return;
    }

    startTransition(async () => {
      const res = await addMealAction(slug, tree.plan.publicId, tree.version.publicId, {
        title: newMealTitle.trim(),
        scheduledTime: newMealTime.trim() || null,
        notes: newMealNotes.trim() || null,
      });

      if (res.success) {
        setIsAddingMeal(false);
        setNewMealTitle("");
        setNewMealTime("");
        setNewMealNotes("");
        await refreshTree();
      } else {
        alert(res.error || "Erro ao adicionar refeição.");
      }
    });
  };

  // 3. Reorder meals
  const handleMoveMeal = async (index: number, direction: "UP" | "DOWN") => {
    const meals = [...tree.meals];
    const targetIdx = direction === "UP" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= meals.length) return;

    const temp = meals[index];
    meals[index] = meals[targetIdx];
    meals[targetIdx] = temp;

    startTransition(async () => {
      const res = await reorderMealsAction(
        slug,
        tree.plan.publicId,
        tree.version.publicId,
        meals.map((m) => m.publicId)
      );
      if (res.success) {
        setTree((prev) => ({ ...prev, meals }));
      } else {
        alert(res.error || "Erro ao reordenar refeições.");
      }
    });
  };

  return (
    <div className="w-full min-h-[calc(100vh-4rem)] bg-[var(--background)] px-4 py-6 sm:py-8">
      <div className="space-y-6 max-w-5xl mx-auto pb-28 sm:pb-20">
        {/* Top Breadcrumb & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <Link
            href={`/consultoria/${slug}/planos-v2`}
            className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors min-h-[36px] depth-interactive"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            <span>Voltar para Planos Alimentares</span>
          </Link>

          {/* Action Controls & Version Badges */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={handleOpenHistory}
              className="px-3.5 py-2 rounded-xl border border-[var(--border-default)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5 shadow-2xs transition-colors depth-interactive min-h-[38px]"
            >
              <HistoryIcon className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
              <span>Histórico</span>
            </button>

            {/* Status Badge */}
            <Badge
              variant={
                tree.version.status === "PUBLISHED"
                  ? "success"
                  : tree.version.status === "DRAFT"
                  ? "warning"
                  : "neutral"
              }
              size="md"
            >
              {tree.version.status === "DRAFT"
                ? `Rascunho (V${tree.version.versionNumber})`
                : tree.version.status === "PUBLISHED"
                ? `Publicada (V${tree.version.versionNumber})`
                : `Arquivada (V${tree.version.versionNumber})`}
            </Badge>

            {/* Lifecycle Buttons */}
            {tree.version.status === "DRAFT" && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setPublishError(null);
                  setIsPublishDialogOpen(true);
                }}
                className="font-bold min-h-[38px] shadow-sm"
              >
                <CheckIcon className="w-3.5 h-3.5 mr-1" />
                <span>Publicar Versão</span>
              </Button>
            )}

            {/* Prescribe Button for Published Version */}
            {tree.version.status === "PUBLISHED" && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsAssignModalOpen(true)}
                className="font-bold min-h-[38px] shadow-sm"
              >
                <UserPlusIcon className="w-3.5 h-3.5 mr-1" />
                <span>Prescrever</span>
              </Button>
            )}

            {tree.version.status !== "DRAFT" && (
              <Button
                variant="primary"
                size="sm"
                disabled={isCreatingVersion}
                onClick={handleCreateNextVersion}
                className="font-bold min-h-[38px] shadow-sm"
              >
                <PlusIcon className="w-3.5 h-3.5 mr-1" />
                <span>{isCreatingVersion ? "Criando versão..." : "Criar Nova Versão"}</span>
              </Button>
            )}
          </div>
        </div>

        {/* Plan Header Card */}
        <div className="p-5 sm:p-6 md:p-7 rounded-2xl sm:rounded-3xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs space-y-5 depth-surface">
          {!isEditingMetadata ? (
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold text-[var(--brand)] uppercase tracking-wider">
                    Plano Alimentar
                  </span>
                  {isReadOnly && (
                    <Badge variant="neutral" size="sm">
                      Somente leitura
                    </Badge>
                  )}
                </div>

                <h1 className="text-xl sm:text-2xl font-extrabold text-[var(--text-primary)] tracking-tight">
                  {tree.version.title}
                </h1>

                {tree.version.subtitle && (
                  <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-medium leading-relaxed">
                    {tree.version.subtitle}
                  </p>
                )}

                {tree.version.objective && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-[var(--surface-subtle)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                    <span>Objetivo:</span>
                    <span className="text-[var(--text-primary)] font-bold">{tree.version.objective}</span>
                  </div>
                )}

                {tree.version.generalGuidance && (
                  <p className="text-xs text-[var(--text-secondary)] pt-1 whitespace-pre-line leading-relaxed">
                    {tree.version.generalGuidance}
                  </p>
                )}
              </div>

              {!isReadOnly && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsEditingMetadata(true)}
                  className="font-semibold text-xs shrink-0 min-h-[36px]"
                >
                  <EditIcon className="w-3.5 h-3.5 mr-1 text-[var(--text-secondary)]" />
                  <span>Editar Informações</span>
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-[var(--text-primary)] mb-1.5">
                    Título do Plano *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--text-primary)] mb-1.5">
                    Subtítulo (opcional)
                  </label>
                  <input
                    type="text"
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    placeholder="Ex: Fase de definição, Protocolo hipertrofia..."
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)] transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-[var(--text-primary)] mb-1.5">
                    Objetivo (opcional)
                  </label>
                  <input
                    type="text"
                    value={objective}
                    onChange={(e) => setObjective(e.target.value)}
                    placeholder="Ex: Emagrecimento, Hipertrofia..."
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--text-primary)] mb-1.5">
                    Observações Internas (opcional)
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Notas internas..."
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)] transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-primary)] mb-1.5">
                  Orientações Gerais ao Paciente
                </label>
                <textarea
                  rows={3}
                  value={generalGuidance}
                  onChange={(e) => setGeneralGuidance(e.target.value)}
                  placeholder="Ex: Ingerir 2 a 3 litros de água por dia. Evitar açúcar refinado..."
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)] transition-colors resize-none"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-[var(--border-subtle)]">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsEditingMetadata(false)}
                  className="font-semibold min-h-[38px]"
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  disabled={isPending}
                  onClick={handleSaveMetadata}
                  className="font-bold min-h-[38px] shadow-sm"
                >
                  {isPending ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </div>
            </div>
          )}

          {/* Primary Daily Totals Bar */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-default)] flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block">
                Meta Diária Prescrita (Refeições Principais)
              </span>
              <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1.5 mt-1.5">
                <span className="text-lg sm:text-xl font-extrabold text-[var(--brand)]">
                  {tree.dailyTotals.caloriesKcal} kcal
                </span>
                <span className="text-xs sm:text-sm font-semibold text-[var(--text-primary)]">
                  Proteínas: <span className="font-normal text-[var(--text-secondary)]">{tree.dailyTotals.proteinG}g</span>
                </span>
                <span className="text-xs sm:text-sm font-semibold text-[var(--text-primary)]">
                  Carboidratos: <span className="font-normal text-[var(--text-secondary)]">{tree.dailyTotals.carbohydrateG}g</span>
                </span>
                <span className="text-xs sm:text-sm font-semibold text-[var(--text-primary)]">
                  Gorduras: <span className="font-normal text-[var(--text-secondary)]">{tree.dailyTotals.fatG}g</span>
                </span>
              </div>
            </div>

            {tree.dailyTotals.hasIncompleteData && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>Total estimado · contém itens customizados sem cálculo</span>
              </div>
            )}
          </div>
        </div>

        {/* Meals Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-[var(--text-primary)]">Refeições do Plano</h2>
              <p className="text-xs text-[var(--text-secondary)] font-medium">
                {tree.meals.length} refeição{tree.meals.length === 1 ? "" : "ões"} configurada{tree.meals.length === 1 ? "" : "s"}
              </p>
            </div>
            {!isReadOnly && !isAddingMeal && (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => setIsAddingMeal(true)}
                className="font-bold min-h-[38px] shadow-sm"
              >
                <PlusIcon className="w-4 h-4 mr-1.5" />
                <span>Adicionar Refeição</span>
              </Button>
            )}
          </div>

          {/* Add Meal Form */}
          {!isReadOnly && isAddingMeal && (
            <div className="p-5 sm:p-6 rounded-2xl bg-[var(--surface)] border border-[var(--brand)]/40 shadow-sm space-y-4 depth-surface">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Nova Refeição</h3>
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
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)] transition-colors"
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
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)] transition-colors"
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
                  placeholder="Ex: Tomar logo ao acordar..."
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)] transition-colors"
                />
              </div>
              <div className="flex justify-end gap-2.5 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsAddingMeal(false)}
                  className="font-semibold min-h-[38px]"
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  disabled={isPending}
                  onClick={handleCreateMeal}
                  className="font-bold min-h-[38px] shadow-sm"
                >
                  {isPending ? "Criando..." : "Criar Refeição"}
                </Button>
              </div>
            </div>
          )}

          {/* Empty state */}
          {tree.meals.length === 0 && !isAddingMeal && (
            <div className="text-center py-16 px-4 bg-[var(--surface)] border border-dashed border-[var(--border-default)] rounded-2xl space-y-3 depth-surface">
              <div className="w-12 h-12 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-[var(--brand)] flex items-center justify-center mx-auto shadow-2xs">
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
                  : "Comece estruturando as refeições diárias (Café da manhã, Almoço, etc.) e adicione alimentos com porções e substituições."}
              </p>
              {!isReadOnly && (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => setIsAddingMeal(true)}
                  className="font-bold min-h-[42px] shadow-sm inline-flex items-center gap-1.5"
                >
                  <PlusIcon className="w-4 h-4 mr-1" />
                  <span>Criar Primeira Refeição</span>
                </Button>
              )}
            </div>
          )}

          {/* Meals Render List */}
          {tree.meals.length > 0 && (
            <div className="space-y-4">
              {tree.meals.map((meal, idx) => (
                <NutritionMealEditor
                  key={meal.publicId}
                  slug={slug}
                  meal={meal}
                  readOnly={isReadOnly}
                  isFirst={idx === 0}
                  isLast={idx === tree.meals.length - 1}
                  onMoveUp={() => handleMoveMeal(idx, "UP")}
                  onMoveDown={() => handleMoveMeal(idx, "DOWN")}
                  onUpdateMeal={async (data) => {
                    startTransition(async () => {
                      const res = await updateMealAction(slug, tree.plan.publicId, meal.publicId, data);
                      if (res.success) await refreshTree();
                      else alert(res.error || "Erro ao atualizar refeição.");
                    });
                  }}
                  onRemoveMeal={async () => {
                    startTransition(async () => {
                      const res = await removeMealAction(slug, tree.plan.publicId, meal.publicId);
                      if (res.success) await refreshTree();
                      else alert(res.error || "Erro ao remover refeição.");
                    });
                  }}
                  onAddItem={async (payload: FoodSelectionResult) => {
                    startTransition(async () => {
                      const res = await addMealItemAction(slug, tree.plan.publicId, meal.publicId, payload);
                      if (res.success) await refreshTree();
                      else alert(res.error || "Erro ao adicionar alimento.");
                    });
                  }}
                  onUpdateItem={async (itemPublicId, data) => {
                    startTransition(async () => {
                      const res = await updateMealItemAction(slug, tree.plan.publicId, itemPublicId, data);
                      if (res.success) await refreshTree();
                      else alert(res.error || "Erro ao atualizar item.");
                    });
                  }}
                  onRemoveItem={async (itemPublicId) => {
                    startTransition(async () => {
                      const res = await removeMealItemAction(slug, tree.plan.publicId, itemPublicId);
                      if (res.success) await refreshTree();
                      else alert(res.error || "Erro ao remover item.");
                    });
                  }}
                  onReorderItems={async (orderedItemPublicIds) => {
                    startTransition(async () => {
                      const res = await reorderMealItemsAction(slug, tree.plan.publicId, meal.publicId, orderedItemPublicIds);
                      if (res.success) await refreshTree();
                      else alert(res.error || "Erro ao reordenar itens.");
                    });
                  }}
                  onAddSubstitution={async (itemPublicId, payload: FoodSelectionResult) => {
                    startTransition(async () => {
                      const res = await addSubstitutionAction(slug, tree.plan.publicId, itemPublicId, payload);
                      if (res.success) await refreshTree();
                      else alert(res.error || "Erro ao adicionar substituição.");
                    });
                  }}
                  onUpdateSubstitution={async (subPublicId, data) => {
                    startTransition(async () => {
                      const res = await updateSubstitutionAction(slug, tree.plan.publicId, subPublicId, data);
                      if (res.success) await refreshTree();
                      else alert(res.error || "Erro ao atualizar substituição.");
                    });
                  }}
                  onRemoveSubstitution={async (subPublicId) => {
                    startTransition(async () => {
                      const res = await removeSubstitutionAction(slug, tree.plan.publicId, subPublicId);
                      if (res.success) await refreshTree();
                      else alert(res.error || "Erro ao remover substituição.");
                    });
                  }}
                  onReorderSubstitutions={async (itemPublicId, orderedSubs) => {
                    startTransition(async () => {
                      const res = await reorderSubstitutionsAction(slug, tree.plan.publicId, itemPublicId, orderedSubs);
                      if (res.success) await refreshTree();
                      else alert(res.error || "Erro ao reordenar substituições.");
                    });
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Alunos Prescritos Section */}
        <div className="p-5 sm:p-6 md:p-7 rounded-2xl sm:rounded-3xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs space-y-4 depth-surface">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="space-y-0.5">
              <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">
                Alunos Prescritos
              </h2>
              <p className="text-xs text-[var(--text-secondary)] font-medium">
                Prescrições ativas e histórico de versões atribuídas aos alunos.
              </p>
            </div>
            {tree.version.status === "PUBLISHED" && (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => setIsAssignModalOpen(true)}
                className="font-bold min-h-[38px] shadow-sm"
              >
                <UserPlusIcon className="w-3.5 h-3.5 mr-1" />
                <span>Prescrever ao Aluno</span>
              </Button>
            )}
          </div>

          <NutritionAssignmentsList
            slug={slug}
            planPublicId={tree.plan.publicId}
            assignments={assignments}
            onRefresh={refreshAssignments}
          />
        </div>

        {/* Mobile Sticky Footer Action Bar */}
        <div className="fixed sm:hidden bottom-0 left-0 right-0 p-3.5 bg-[var(--surface)]/95 backdrop-blur-md border-t border-[var(--border-strong)] z-30 shadow-lg flex items-center gap-2.5">
          {!isReadOnly ? (
            <>
              <button
                type="button"
                onClick={() => setIsAddingMeal(true)}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-3 px-3 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-default)] text-xs font-semibold text-[var(--text-primary)] active:scale-98 transition-all min-h-[44px] cursor-pointer"
              >
                <PlusIcon className="w-4 h-4 text-[var(--brand)] shrink-0" />
                <span>+ Refeição</span>
              </button>
              <button
                type="button"
                onClick={() => setIsPublishDialogOpen(true)}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-3 px-4 rounded-2xl bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white text-xs font-bold shadow-sm active:scale-98 transition-all min-h-[44px] cursor-pointer"
              >
                <CheckIcon className="w-4 h-4 shrink-0" />
                <span>Publicar Plano</span>
              </button>
            </>
          ) : (
            <>
              {tree.version.status === "PUBLISHED" && (
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(true)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-3 px-3 rounded-2xl bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white text-xs font-bold shadow-sm active:scale-98 transition-all min-h-[44px] cursor-pointer"
                >
                  <UserPlusIcon className="w-4 h-4 shrink-0" />
                  <span>Prescrever</span>
                </button>
              )}
              {tree.version.status !== "DRAFT" && (
                <button
                  type="button"
                  onClick={handleCreateNextVersion}
                  disabled={isCreatingVersion}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-3 px-3 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-default)] text-xs font-bold text-[var(--text-primary)] active:scale-98 transition-all min-h-[44px] cursor-pointer disabled:opacity-50"
                >
                  <PlusIcon className="w-4 h-4 shrink-0" />
                  <span>{isCreatingVersion ? "Criando..." : "Nova Versão"}</span>
                </button>
              )}
            </>
          )}
        </div>

        {/* Publish Dialog */}
        <NutritionPublishDialog
          isOpen={isPublishDialogOpen}
          onClose={() => setIsPublishDialogOpen(false)}
          onConfirm={handleConfirmPublish}
          tree={tree}
          isPublishing={isPublishing}
          errorMessage={publishError}
        />

        {/* Version History Drawer / Modal */}
        <NutritionVersionHistory
          slug={slug}
          planPublicId={tree.plan.publicId}
          currentVersionPublicId={tree.version.publicId}
          versions={historyItems}
          isOpen={isHistoryOpen}
          isLoading={isLoadingHistory}
          onClose={() => setIsHistoryOpen(false)}
        />

        {/* Prescribe / Assign Modal */}
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
    </div>
  );
}
