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
import { NutritionAssignmentsList } from "./nutrition-assignments-list";
import { NutritionMicronutrientsPanel } from "./nutrition-micronutrients-panel";
import { MobileActionSheet } from "@/components/ui/mobile";
import type { AssignmentListItemDto } from "@/lib/nutrition-v2/assignment-repository";
import type { FoodSelectionResult } from "./nutrition-food-picker";

export interface PatientBuilderContext {
  studentMembershipPublicId: string;
  studentPublicId: string;
  studentName: string;
  returnToUrl: string;
}

interface NutritionPlanBuilderProps {
  slug: string;
  initialTree: PlanVersionTreeDto;
  initialAssignments?: AssignmentListItemDto[];
  patientContext?: PatientBuilderContext;
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

function TrashIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
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
      <path d="M3 6h18m-2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

export function NutritionPlanBuilder({
  slug,
  initialTree,
  initialAssignments = [],
  patientContext,
}: NutritionPlanBuilderProps) {
  const router = useRouter();
  const [tree, setTree] = useState<PlanVersionTreeDto>(initialTree);
  const [isPending, startTransition] = useTransition();
  const [isDiscarding, setIsDiscarding] = useState(false);

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
  const [isMicronutrientsDrawerOpen, setIsMicronutrientsDrawerOpen] = useState(false);
  const [newMealTitle, setNewMealTitle] = useState("");
  const [newMealTime, setNewMealTime] = useState("");
  const [newMealNotes, setNewMealNotes] = useState("");

  // Publish Dialog & History Dialog states
  const [isPublishDialogOpen, setIsPublishDialogOpen] = useState(false);
  const [isSaveTemplateDialogOpen, setIsSaveTemplateDialogOpen] = useState(false);
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
  const [isMobileActionSheetOpen, setIsMobileActionSheetOpen] = useState(false);

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
    <div className="w-full min-h-[calc(100vh-4rem)] bg-transparent px-3 sm:px-4 md:px-6 py-4 sm:py-8">
      <div className="space-y-6 max-w-7xl mx-auto pb-28 sm:pb-20 w-full min-w-0">
        {/* Top Breadcrumb & Actions */}
        <div className="flex items-center justify-between gap-2.5 min-w-0 w-full">
          <Link
            href={patientContext ? patientContext.returnToUrl : `/consultoria/${slug}/planos-v2`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors min-h-[36px] depth-interactive min-w-0 max-w-[calc(100%-110px)] sm:max-w-none"
          >
            <ArrowLeftIcon className="w-4 h-4 shrink-0" />
            <span className="truncate">{patientContext ? `Voltar para paciente (${patientContext.studentName})` : "Voltar para Planos"}</span>
          </Link>

          {/* Desktop Action Controls & Version Badges */}
          <div className="hidden sm:flex items-center gap-2.5 flex-wrap shrink-0">
            <button
              type="button"
              onClick={handleOpenHistory}
              className="px-3.5 py-2 rounded-xl border border-[var(--border-default)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5 shadow-2xs transition-colors depth-interactive min-h-[38px]"
            >
              <HistoryIcon className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
              <span>Histórico</span>
            </button>

            <a
              href={`/api/consultancies/${slug}/nutricao/pdf?planPublicId=${initialTree.plan.publicId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 rounded-xl border border-[var(--border-default)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5 shadow-2xs transition-colors depth-interactive min-h-[38px]"
              title="Baixar plano alimentar em PDF oficial"
            >
              <svg className="w-3.5 h-3.5 text-[var(--brand)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Baixar PDF</span>
            </a>

            <button
              type="button"
              onClick={() => setIsSaveTemplateDialogOpen(true)}
              className="px-3.5 py-2 rounded-xl border border-[var(--border-default)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5 shadow-2xs transition-colors depth-interactive min-h-[38px]"
              title="Salvar estrutura deste plano como modelo reutilizável"
            >
              <svg className="w-3.5 h-3.5 text-[var(--text-secondary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              <span>Salvar como modelo</span>
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
                <span>{patientContext ? "Publicar atualização" : "Publicar Versão"}</span>
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

          {/* Mobile Badge Only */}
          <div className="sm:hidden flex items-center gap-2 shrink-0">
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
          </div>
        </div>

        {/* Patient Context Banner */}
        {patientContext && (
          <div className="p-3.5 sm:p-4 rounded-2xl bg-[var(--surface)] border border-[var(--brand)]/30 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0 w-full">
            <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
              <div className="w-9 h-9 rounded-xl bg-[var(--brand)] text-[var(--text-inverse)] flex items-center justify-center font-extrabold text-sm shrink-0 shadow-xs mt-0.5 sm:mt-0">
                {patientContext.studentName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-extrabold text-[var(--text-primary)] break-words">
                    Plano alimentar de {patientContext.studentName}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--brand)] text-[var(--text-inverse)] shrink-0">
                    {tree.version.status === "DRAFT" ? "Alteração em andamento" : "Plano publicado"}
                  </span>
                </div>
                <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 break-words leading-relaxed">
                  {tree.version.status === "DRAFT"
                    ? "Enquanto este rascunho estiver em edição, o aluno continua visualizando a prescrição ativa anterior."
                    : "Este plano está publicado e ativo para a paciente."}
                </p>
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-2 shrink-0">
              {tree.version.status === "DRAFT" && (
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={isDiscarding}
                  onClick={handleDiscardDraft}
                  className="text-xs font-bold min-h-[38px] text-red-600 dark:text-red-400 hover:bg-red-500/10 border border-red-500/20"
                >
                  {isDiscarding ? "Descartando..." : "Descartar alterações"}
                </Button>
              )}
              {tree.version.status === "DRAFT" && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setPublishError(null);
                    setIsPublishDialogOpen(true);
                  }}
                  className="text-xs font-bold min-h-[38px] shadow-sm"
                >
                  <CheckIcon className="w-3.5 h-3.5 mr-1" />
                  <span>Publicar atualização</span>
                </Button>
              )}
            </div>
          </div>
        )}

        {/* 12-Column Responsive Workspace Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start w-full min-w-0">
          {/* LEFT / MAIN WORKSPACE: Plan Header & Meals */}
          <div className="lg:col-span-8 space-y-6 w-full min-w-0">
            {/* Plan Header Card */}
            <div className="p-4 sm:p-6 md:p-7 rounded-xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs space-y-4 sm:space-y-5 depth-surface w-full min-w-0">
              {!isEditingMetadata ? (
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4">
                  <div className="space-y-1.5 sm:space-y-2 min-w-0 flex-1">
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

                    <h1 className="text-lg sm:text-2xl font-extrabold text-[var(--text-primary)] tracking-tight break-words">
                      {tree.version.title}
                    </h1>

                    {tree.version.subtitle && (
                      <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-medium leading-relaxed break-words">
                        {tree.version.subtitle}
                      </p>
                    )}

                    {tree.version.objective && (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-[var(--surface-subtle)] text-[var(--text-secondary)] border border-[var(--border-subtle)] max-w-full">
                        <span className="shrink-0">Objetivo:</span>
                        <span className="text-[var(--text-primary)] font-bold truncate">{tree.version.objective}</span>
                      </div>
                    )}

                    {tree.version.generalGuidance && (
                      <p className="text-xs text-[var(--text-secondary)] pt-1 whitespace-pre-line leading-relaxed break-words">
                        {tree.version.generalGuidance}
                      </p>
                    )}
                  </div>

                  {!isReadOnly && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setIsEditingMetadata(true)}
                      className="font-semibold text-xs shrink-0 min-h-[38px] self-start"
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
            <div className="p-5 sm:p-6 rounded-xl bg-[var(--surface)] border border-[var(--brand)]/40 shadow-sm space-y-4 depth-surface">
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
            <div className="text-center py-16 px-4 bg-[var(--surface)] border border-dashed border-[var(--border-default)] rounded-xl space-y-3 depth-surface">
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

        {/* Mobile In-Flow Totals Block (Below Meals) */}
        <div className="lg:hidden p-4 sm:p-5 rounded-xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xs space-y-3 depth-surface w-full min-w-0">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2.5">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-tertiary)] block">
                Total Diário
              </span>
              <div className="text-xl font-extrabold text-[var(--brand)] font-heading leading-tight">
                {tree.dailyTotals.caloriesKcal.toLocaleString("pt-BR")}{" "}
                <span className="text-xs font-semibold text-[var(--text-secondary)]">kcal</span>
              </div>
            </div>
            {tree.dailyMicronutrientTotals?.nutrients?.FIBER && (
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-tertiary)] block">
                  Fibras
                </span>
                <span className="text-xs font-bold text-[var(--text-primary)]">
                  {tree.dailyMicronutrientTotals.nutrients.FIBER.value} g
                </span>
              </div>
            )}
          </div>

          {/* Macro Breakdown 3 Columns */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 sm:p-2.5 rounded-lg bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-0.5 min-w-0">
              <span className="text-[9px] sm:text-[10px] uppercase font-bold text-sky-600 dark:text-sky-400 block truncate">
                Proteínas
              </span>
              <span className="text-xs sm:text-sm font-extrabold text-[var(--text-primary)] block tabular-nums truncate">
                {tree.dailyTotals.proteinG}g
              </span>
            </div>
            <div className="p-2 sm:p-2.5 rounded-lg bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-0.5 min-w-0">
              <span className="text-[9px] sm:text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 block truncate">
                Carboidratos
              </span>
              <span className="text-xs sm:text-sm font-extrabold text-[var(--text-primary)] block tabular-nums truncate">
                {tree.dailyTotals.carbohydrateG}g
              </span>
            </div>
            <div className="p-2 sm:p-2.5 rounded-lg bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-0.5 min-w-0">
              <span className="text-[9px] sm:text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400 block truncate">
                Gorduras
              </span>
              <span className="text-xs sm:text-sm font-extrabold text-[var(--text-primary)] block tabular-nums truncate">
                {tree.dailyTotals.fatG}g
              </span>
            </div>
          </div>

          {/* Incomplete data notice */}
          {!tree.dailyTotals.empty && tree.dailyTotals.hasIncompleteData && (
            <div className="flex items-start gap-1.5 p-2 rounded-lg text-[10px] font-medium bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
              <span className="font-bold shrink-0">*</span>
              <span className="break-words">Subtotal conhecido: alguns alimentos possuem informações nutricionais ausentes.</span>
            </div>
          )}

          {/* Button: Ver micronutrientes */}
          <button
            type="button"
            onClick={() => setIsMicronutrientsDrawerOpen(true)}
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] border border-[var(--border-default)] text-xs font-bold text-[var(--text-primary)] transition-all cursor-pointer shadow-2xs active:scale-98 min-h-[44px]"
          >
            <svg className="w-3.5 h-3.5 text-[var(--brand)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
            <span>Ver micronutrientes</span>
          </button>
        </div>

        {/* Alunos Prescritos Section */}
        <div className="p-5 sm:p-6 md:p-7 rounded-xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs space-y-4 depth-surface">
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
      </div>

      {/* RIGHT / STICKY PANEL: Nutritional Analysis */}
      <div className="hidden lg:block lg:col-span-4 lg:sticky lg:top-6 space-y-4">
        {/* Daily Totals Cockpit */}
        <div className="p-5 rounded-xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] block">
                Totais Nutricionais
              </span>
              <h3 className="font-heading text-base font-bold text-[var(--text-primary)]">
                Análise Diária do Cardápio
              </h3>
            </div>
            <div className="text-right">
              <div className="text-2xl font-extrabold text-[var(--brand)] font-heading leading-tight">
                {tree.dailyTotals.caloriesKcal.toLocaleString("pt-BR")}
                <span className="text-xs font-semibold text-[var(--text-secondary)] ml-1">kcal</span>
              </div>
            </div>
          </div>

          {/* Macro Breakdown Cards */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-sky-600 dark:text-sky-400 block">Proteínas</span>
              <span className="text-sm font-extrabold text-[var(--text-primary)] block tabular-nums">
                {tree.dailyTotals.proteinG}g
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 block">Carboidratos</span>
              <span className="text-sm font-extrabold text-[var(--text-primary)] block tabular-nums">
                {tree.dailyTotals.carbohydrateG}g
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400 block">Gorduras</span>
              <span className="text-sm font-extrabold text-[var(--text-primary)] block tabular-nums">
                {tree.dailyTotals.fatG}g
              </span>
            </div>
          </div>

          {/* Fiber row */}
          {tree.dailyMicronutrientTotals?.nutrients?.FIBER && (
            <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-[var(--surface-subtle)]/70 text-xs border border-[var(--border-subtle)]">
              <span className="text-[var(--text-secondary)] font-medium">Fibras Alimentares</span>
              <span className="font-bold text-[var(--text-primary)]">
                {tree.dailyMicronutrientTotals.nutrients.FIBER.value} g
              </span>
            </div>
          )}

          {/* Incomplete data notice */}
          {!tree.dailyTotals.empty && tree.dailyTotals.hasIncompleteData && (
            <div className="flex items-start gap-2 p-2.5 rounded-xl text-[11px] font-medium bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
              <span className="font-bold shrink-0">*</span>
              <span>Subtotal conhecido: alguns alimentos possuem informações nutricionais ausentes na base.</span>
            </div>
          )}
                  {/* Button: Ver micronutrientes */}
          <button
            type="button"
            onClick={() => setIsMicronutrientsDrawerOpen(true)}
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] border border-[var(--border-default)] text-xs font-bold text-[var(--text-primary)] transition-all cursor-pointer shadow-2xs hover:border-[var(--brand)]/40 active:scale-98 min-h-[38px]"
          >
            <svg className="w-3.5 h-3.5 text-[var(--brand)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
            <span>Ver micronutrientes</span>
          </button>
</div>

        {/* Plan Micronutrients Panel */}
        {tree.dailyMicronutrientTotals && (
          <>
            <NutritionMicronutrientsPanel
              totals={tree.dailyMicronutrientTotals}
              title="Micronutrientes do Plano"
              isDrawer={true}
              isOpen={isMicronutrientsDrawerOpen}
              onClose={() => setIsMicronutrientsDrawerOpen(false)}
            />
            <NutritionMicronutrientsPanel
              totals={tree.dailyMicronutrientTotals}
              title="Micronutrientes do Plano"
              defaultCollapsed={true}
            />
          </>
        )}
      </div>
    </div>

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

      {/* Mobile Sticky Bottom Action Bar */}
      <div className="sm:hidden fixed bottom-0 inset-x-0 z-40 bg-[var(--surface)]/95 backdrop-blur-md border-t border-[var(--border-default)] p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] shadow-lg flex items-center justify-between gap-2.5">
        <button
          type="button"
          aria-label="Mais ações do plano"
          onClick={() => setIsMobileActionSheetOpen(true)}
          className="min-h-[48px] min-w-[48px] rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] active:scale-95 text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center shrink-0 cursor-pointer"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="1" />
            <circle cx="12" cy="5" r="1" />
            <circle cx="12" cy="19" r="1" />
          </svg>
        </button>

        {tree.version.status === "DRAFT" && (
          <Button
            variant="primary"
            size="md"
            onClick={() => {
              setPublishError(null);
              setIsPublishDialogOpen(true);
            }}
            className="flex-1 font-bold min-h-[48px] shadow-sm flex items-center justify-center gap-1.5 text-xs sm:text-sm"
          >
            <CheckIcon className="w-4 h-4" />
            <span>{patientContext ? "Publicar atualização" : "Publicar Versão"}</span>
          </Button>
        )}

        {tree.version.status === "PUBLISHED" && (
          <Button
            variant="primary"
            size="md"
            onClick={() => setIsAssignModalOpen(true)}
            className="flex-1 font-bold min-h-[48px] shadow-sm flex items-center justify-center gap-1.5 text-xs sm:text-sm"
          >
            <UserPlusIcon className="w-4 h-4" />
            <span>Prescrever ao Aluno</span>
          </Button>
        )}

        {tree.version.status !== "DRAFT" && tree.version.status !== "PUBLISHED" && (
          <Button
            variant="primary"
            size="md"
            disabled={isCreatingVersion}
            onClick={handleCreateNextVersion}
            className="flex-1 font-bold min-h-[48px] shadow-sm flex items-center justify-center gap-1.5 text-xs sm:text-sm"
          >
            <PlusIcon className="w-4 h-4" />
            <span>{isCreatingVersion ? "Criando versão..." : "Criar Nova Versão"}</span>
          </Button>
        )}
      </div>

      {/* Mobile Action Sheet for secondary actions */}
      <MobileActionSheet
        isOpen={isMobileActionSheetOpen}
        onClose={() => setIsMobileActionSheetOpen(false)}
        title={tree.version.title}
        options={[
          ...(tree.version.status === "DRAFT" && patientContext ? [{
            id: "discard-draft",
            label: "Descartar alterações",
            icon: <TrashIcon className="w-4 h-4 text-red-600 dark:text-red-400" />,
            variant: "danger" as const,
            disabled: isDiscarding,
            onClick: handleDiscardDraft,
          }] : []),
          ...(!isReadOnly ? [{
            id: "add-meal",
            label: "Adicionar Refeição",
            icon: <PlusIcon className="w-4 h-4 text-[var(--brand)]" />,
            onClick: () => setIsAddingMeal(true),
          }, {
            id: "edit-meta",
            label: "Editar Informações do Plano",
            icon: <EditIcon className="w-4 h-4 text-[var(--brand)]" />,
            onClick: () => setIsEditingMetadata(true),
          }] : []),
          {
            id: "history",
            label: "Histórico de Versões",
            icon: <HistoryIcon className="w-4 h-4 text-[var(--text-secondary)]" />,
            onClick: () => handleOpenHistory(),
          },
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
          {
            id: "template",
            label: "Salvar como modelo",
            icon: (
              <svg className="w-4 h-4 text-[var(--text-secondary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            ),
            onClick: () => setIsSaveTemplateDialogOpen(true),
          },
        ]}
      />
    </div>
  );
}
