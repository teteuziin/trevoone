"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
    <div className="space-y-6 max-w-5xl mx-auto pb-20">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Link
          href={`/consultoria/${slug}/planos-v2`}
          className="inline-flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
          <span>Voltar para Planos Alimentares</span>
        </Link>

        {/* Action Controls & Version Badges */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={handleOpenHistory}
            className="px-3 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-primary)] hover:bg-[var(--surface-secondary)] text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <svg className="w-3.5 h-3.5 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Histórico</span>
          </button>

          {/* Status Badge */}
          {tree.version.status === "DRAFT" ? (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
              Rascunho (V{tree.version.versionNumber})
            </span>
          ) : tree.version.status === "PUBLISHED" ? (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
              Publicada (V{tree.version.versionNumber})
            </span>
          ) : (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border border-zinc-500/20">
              Arquivada (V{tree.version.versionNumber})
            </span>
          )}

          {/* Lifecycle Buttons */}
          {tree.version.status === "DRAFT" && (
            <button
              type="button"
              onClick={() => {
                setPublishError(null);
                setIsPublishDialogOpen(true);
              }}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              <span>Publicar Versão</span>
            </button>
          )}

          {/* Prescribe Button for Published Version */}
          {tree.version.status === "PUBLISHED" && (
            <button
              type="button"
              onClick={() => setIsAssignModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>Prescrever</span>
            </button>
          )}

          {tree.version.status !== "DRAFT" && (
            <button
              type="button"
              disabled={isCreatingVersion}
              onClick={handleCreateNextVersion}
              className="px-3.5 py-1.5 rounded-xl bg-[var(--brand-primary)] hover:opacity-90 text-white text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              <span>{isCreatingVersion ? "Criando versão..." : "Criar Nova Versão"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Plan Header Card */}
      <div className="bg-[var(--surface-primary)] border border-[var(--border)] rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
        {!isEditingMetadata ? (
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] tracking-tight">
                  {tree.version.title}
                </h1>
                {isReadOnly && (
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[var(--surface-secondary)] text-[var(--text-muted)] border border-[var(--border)]">
                    Somente leitura
                  </span>
                )}
              </div>
              {tree.version.subtitle && (
                <p className="text-sm text-[var(--text-secondary)]">{tree.version.subtitle}</p>
              )}
              {tree.version.objective && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-[var(--surface-secondary)] text-[var(--text-secondary)] border border-[var(--border)]">
                  <span>Objetivo:</span>
                  <span className="text-[var(--text-primary)]">{tree.version.objective}</span>
                </div>
              )}
              {tree.version.generalGuidance && (
                <p className="text-xs text-[var(--text-muted)] pt-1 whitespace-pre-line">
                  {tree.version.generalGuidance}
                </p>
              )}
            </div>
            {!isReadOnly && (
              <button
                type="button"
                onClick={() => setIsEditingMetadata(true)}
                className="px-3 py-1.5 text-xs font-medium rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)] text-[var(--text-primary)] hover:bg-[var(--border)] shrink-0 flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                <span>Editar Informações</span>
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">Título do Plano: *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-[var(--border)] bg-[var(--surface-primary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-primary)]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">Subtítulo (opcional):</label>
                <input
                  type="text"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="Ex: Fase de definição, Protocolo hipertrofia..."
                  className="w-full px-3 py-2 text-sm rounded-xl border border-[var(--border)] bg-[var(--surface-primary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-primary)]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">Objetivo (opcional):</label>
                <input
                  type="text"
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                  placeholder="Ex: Emagrecimento, Hipertrofia..."
                  className="w-full px-3 py-2 text-sm rounded-xl border border-[var(--border)] bg-[var(--surface-primary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-primary)]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">Observações gerais:</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notas internas..."
                  className="w-full px-3 py-2 text-sm rounded-xl border border-[var(--border)] bg-[var(--surface-primary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-primary)]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">Orientações gerais ao paciente:</label>
              <textarea
                rows={3}
                value={generalGuidance}
                onChange={(e) => setGeneralGuidance(e.target.value)}
                placeholder="Ex: Ingerir 2 a 3 litros de água por dia. Evitar açúcar refinado..."
                className="w-full px-3 py-2 text-sm rounded-xl border border-[var(--border)] bg-[var(--surface-primary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-primary)] resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={() => setIsEditingMetadata(false)}
                className="px-4 py-2 text-xs font-medium rounded-xl border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)]"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleSaveMetadata}
                className="px-4 py-2 text-xs font-medium rounded-xl bg-[var(--brand-primary)] text-white hover:opacity-90 shadow-sm"
              >
                {isPending ? "Salvando..." : "Salvar Alterações"}
              </button>
            </div>
          </div>
        )}

        {/* Primary Daily Totals Bar */}
        <div className="p-4 rounded-xl bg-[var(--surface-secondary)]/70 border border-[var(--border)] flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider block">
              Meta Diária Prescrita (Refeições Principais)
            </span>
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 mt-1">
              <span className="text-lg font-bold text-amber-600 dark:text-amber-400">
                {tree.dailyTotals.caloriesKcal} kcal
              </span>
              <span className="text-sm font-semibold text-[var(--text-primary)]">
                Proteínas: <span className="font-normal">{tree.dailyTotals.proteinG}g</span>
              </span>
              <span className="text-sm font-semibold text-[var(--text-primary)]">
                Carboidratos: <span className="font-normal">{tree.dailyTotals.carbohydrateG}g</span>
              </span>
              <span className="text-sm font-semibold text-[var(--text-primary)]">
                Gorduras: <span className="font-normal">{tree.dailyTotals.fatG}g</span>
              </span>
            </div>
          </div>

          {tree.dailyTotals.hasIncompleteData && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
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
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">Refeições do Plano</h2>
            <p className="text-xs text-[var(--text-muted)]">
              {tree.meals.length} refeição{tree.meals.length === 1 ? "" : "ões"} configurada{tree.meals.length === 1 ? "" : "s"}
            </p>
          </div>
          {!isReadOnly && !isAddingMeal && (
            <button
              type="button"
              onClick={() => setIsAddingMeal(true)}
              className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-[var(--brand-primary)] text-white hover:opacity-90 shadow-sm flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>Adicionar Refeição</span>
            </button>
          )}
        </div>

        {/* Add Meal Form */}
        {!isReadOnly && isAddingMeal && (
          <div className="p-4 sm:p-5 rounded-2xl bg-[var(--surface-primary)] border border-[var(--brand-primary)]/50 shadow-md space-y-3">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Nova Refeição</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">Nome da refeição: *</label>
                <input
                  type="text"
                  value={newMealTitle}
                  onChange={(e) => setNewMealTitle(e.target.value)}
                  placeholder="Ex: Café da manhã, Almoço, Lanche da tarde..."
                  className="w-full px-3 py-2 text-sm rounded-xl border border-[var(--border)] bg-[var(--surface-primary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-primary)]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">Horário (opcional):</label>
                <input
                  type="time"
                  value={newMealTime}
                  onChange={(e) => setNewMealTime(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-[var(--border)] bg-[var(--surface-primary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-primary)]"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">Observações (opcional):</label>
              <input
                type="text"
                value={newMealNotes}
                onChange={(e) => setNewMealNotes(e.target.value)}
                placeholder="Ex: Tomar logo ao acordar..."
                className="w-full px-3 py-2 text-sm rounded-xl border border-[var(--border)] bg-[var(--surface-primary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-primary)]"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddingMeal(false)}
                className="px-4 py-2 text-xs font-medium rounded-xl border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)]"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleCreateMeal}
                className="px-4 py-2 text-xs font-medium rounded-xl bg-[var(--brand-primary)] text-white hover:opacity-90 shadow-sm"
              >
                {isPending ? "Criando..." : "Criar Refeição"}
              </button>
            </div>
          </div>
        )}

        {/* Empty state (Section 63) */}
        {tree.meals.length === 0 && !isAddingMeal && (
          <div className="text-center py-16 px-4 bg-[var(--surface-primary)] border border-dashed border-[var(--border)] rounded-2xl space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] flex items-center justify-center mx-auto">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-[var(--text-primary)]">
              {isReadOnly ? "Nenhuma refeição cadastrada" : "Adicione a primeira refeição"}
            </h3>
            <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
              {isReadOnly
                ? "Esta versão não possui refeições cadastradas."
                : "Comece estruturando as refeições diárias (Café da manhã, Almoço, etc.) e adicione alimentos com porções e substituições."}
            </p>
            {!isReadOnly && (
              <button
                type="button"
                onClick={() => setIsAddingMeal(true)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-[var(--brand-primary)] text-white hover:opacity-90 shadow-sm inline-flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span>Criar Primeira Refeição</span>
              </button>
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
      <div className="bg-[var(--surface-primary)] border border-[var(--border)] rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="space-y-0.5">
            <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">
              Alunos Prescritos
            </h2>
            <p className="text-xs text-[var(--text-secondary)]">
              Prescrições ativas e histórico de versões atribuídas aos alunos.
            </p>
          </div>
          {tree.version.status === "PUBLISHED" && (
            <button
              type="button"
              onClick={() => setIsAssignModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              <span>Prescrever ao Aluno</span>
            </button>
          )}
        </div>

        <NutritionAssignmentsList
          slug={slug}
          planPublicId={tree.plan.publicId}
          assignments={assignments}
          onRefresh={refreshAssignments}
        />
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
  );
}
