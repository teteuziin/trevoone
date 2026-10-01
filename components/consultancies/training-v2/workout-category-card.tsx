"use client";

import { useState, useTransition } from "react";
import type {
  WorkoutBlockDto,
  WorkoutBlockItemDto,
} from "@/lib/training-v2/types";
import type { QuickConfigInput } from "@/lib/training-v2/workout-repository";
import { ExerciseExecutionModal } from "./exercise-execution-modal";
import {
  parseRepsInput,
  formatRepetitionRange,
  formatDurationNatural,
} from "@/lib/training-v2/reps-normalizer";

function MoreVertical({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="1" />
      <circle cx="12" cy="5" r="1" />
      <circle cx="12" cy="19" r="1" />
    </svg>
  );
}

function ArrowUp({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
    </svg>
  );
}

function ArrowDown({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function Plus({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  );
}

function Edit2({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
    </svg>
  );
}

function Copy({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function Trash2({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <polyline points="3 6 5 6 21 6" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function MoveIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <polyline points="5 9 2 12 5 15" />
      <polyline points="9 5 12 2 15 5" />
      <polyline points="15 19 12 22 9 19" />
      <polyline points="19 9 22 12 19 15" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <line x1="12" y1="2" x2="12" y2="22" />
    </svg>
  );
}

function Check({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export type CategoryCardProps = {
  category: WorkoutBlockDto;
  categoryIndex: number;
  totalCategories: number;
  allCategories: { publicId: string; title: string }[];
  isDraft: boolean;
  onOpenExercisePicker: (categoryPublicId: string, subBlockPublicId?: string) => void;
  onRenameCategory: (categoryPublicId: string, newTitle: string) => Promise<void>;
  onDuplicateCategory: (categoryPublicId: string) => Promise<void>;
  onDeleteCategory: (categoryPublicId: string) => Promise<void>;
  onMoveCategoryUp: (categoryIndex: number) => Promise<void>;
  onMoveCategoryDown: (categoryIndex: number) => Promise<void>;
  onDuplicateExercise: (itemPublicId: string) => Promise<void>;
  onMoveExerciseToCategory: (itemPublicId: string, targetCategoryPublicId: string) => Promise<void>;
  onDeleteExercise: (itemPublicId: string) => Promise<void>;
  onMoveExerciseUp: (categoryPublicId: string, itemIndex: number) => Promise<void>;
  onMoveExerciseDown: (categoryPublicId: string, itemIndex: number) => Promise<void>;
  onUpdateExerciseQuickConfig: (itemPublicId: string, config: QuickConfigInput) => Promise<void>;
  // Sub-blocks (Grupos)
  onCreateSubBlock?: (categoryPublicId: string, title: string) => Promise<void>;
  onRenameSubBlock?: (subBlockPublicId: string, newTitle: string) => Promise<void>;
  onDuplicateSubBlock?: (subBlockPublicId: string) => Promise<void>;
  onDeleteSubBlock?: (subBlockPublicId: string) => Promise<void>;
  onMoveSubBlockUp?: (categoryPublicId: string, subBlockIndex: number) => Promise<void>;
  onMoveSubBlockDown?: (categoryPublicId: string, subBlockIndex: number) => Promise<void>;
  onResolveExercise?: (itemPublicId: string) => void;
};

export function WorkoutCategoryCard({
  category,
  categoryIndex,
  totalCategories,
  allCategories,
  isDraft,
  onOpenExercisePicker,
  onRenameCategory,
  onDuplicateCategory,
  onDeleteCategory,
  onMoveCategoryUp,
  onMoveCategoryDown,
  onDuplicateExercise,
  onMoveExerciseToCategory,
  onDeleteExercise,
  onMoveExerciseUp,
  onMoveExerciseDown,
  onUpdateExerciseQuickConfig,
  onCreateSubBlock,
  onRenameSubBlock,
  onDuplicateSubBlock,
  onDeleteSubBlock,
  onMoveSubBlockUp,
  onMoveSubBlockDown,
  onResolveExercise,
}: CategoryCardProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(category.title || "");
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
  const [expandedExerciseId, setExpandedExerciseId] = useState<string | null>(null);
  const [activeExerciseMenuId, setActiveExerciseMenuId] = useState<string | null>(null);
  const [movingExerciseId, setMovingExerciseId] = useState<string | null>(null);

  // Sub-block management state
  const [isCreatingSubBlock, setIsCreatingSubBlock] = useState(false);
  const [newSubBlockTitle, setNewSubBlockTitle] = useState("");
  const [editingSubBlockId, setEditingSubBlockId] = useState<string | null>(null);
  const [subBlockTitleDraft, setSubBlockTitleDraft] = useState("");
  const [activeSubBlockMenuId, setActiveSubBlockMenuId] = useState<string | null>(null);

  const [, startTransition] = useTransition();

  const items = category.items || [];
  const categoryTitle = category.title || `Treino ${categoryIndex + 1}`;
  const subBlocks = category.subBlocks || [];
  const hasSubBlocks = subBlocks.length > 0;
  const sortedSubBlocks = hasSubBlocks
    ? [...subBlocks].sort((a, b) => a.sortOrder - b.sortOrder)
    : [];

  function handleSaveTitle() {
    if (!titleDraft.trim()) {
      setIsEditingTitle(false);
      return;
    }
    startTransition(async () => {
      await onRenameCategory(category.publicId, titleDraft.trim());
      setIsEditingTitle(false);
    });
  }

  function handleCreateSubBlockSubmit() {
    if (!newSubBlockTitle.trim() || !onCreateSubBlock) return;
    startTransition(async () => {
      await onCreateSubBlock(category.publicId, newSubBlockTitle.trim());
      setNewSubBlockTitle("");
      setIsCreatingSubBlock(false);
    });
  }

  function handleSaveSubBlockTitle(subBlockPublicId: string) {
    if (!subBlockTitleDraft.trim() || !onRenameSubBlock) {
      setEditingSubBlockId(null);
      return;
    }
    startTransition(async () => {
      await onRenameSubBlock(subBlockPublicId, subBlockTitleDraft.trim());
      setEditingSubBlockId(null);
    });
  }

  return (
    <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs overflow-hidden transition-all">
      {/* Category Header */}
      <div className="px-4 sm:px-5 py-3 border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)]/50 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {isEditingTitle && isDraft ? (
            <div className="flex items-center gap-1.5 flex-1 max-w-sm">
              <input
                type="text"
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveTitle();
                  if (e.key === "Escape") setIsEditingTitle(false);
                }}
                autoFocus
                placeholder="Nome do treino (ex: Segunda — Peito)"
                className="w-full px-3 py-1 text-xs sm:text-sm font-bold uppercase rounded-lg border border-emerald-500 bg-[var(--surface)] text-[var(--text-primary)] focus:outline-none min-h-[32px]"
              />
              <button
                type="button"
                onClick={handleSaveTitle}
                className="p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 min-h-[32px] min-w-[32px] flex items-center justify-center shrink-0 cursor-pointer"
                title="Salvar nome"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="min-w-0 flex items-center gap-2 flex-wrap">
              <h2
                onClick={() => {
                  if (isDraft) {
                    setTitleDraft(category.title || "");
                    setIsEditingTitle(true);
                  }
                }}
                className={`text-sm font-bold uppercase tracking-wider text-[var(--text-primary)] truncate ${
                  isDraft ? "cursor-pointer hover:text-emerald-600 transition-colors" : ""
                }`}
                title={isDraft ? "Clique para renomear" : undefined}
              >
                {categoryTitle}
              </h2>
              <span className="text-[10px] sm:text-[11px] font-medium px-2 py-0.5 rounded-md bg-[var(--surface-sunken)] border border-[var(--border-subtle)] text-[var(--text-secondary)] whitespace-nowrap">
                {items.length} {items.length === 1 ? "exercício" : "exercícios"}
                {hasSubBlocks ? ` • ${subBlocks.length} ${subBlocks.length === 1 ? "grupo" : "grupos"}` : ""}
              </span>
            </div>
          )}
        </div>

        {/* Category Actions */}
        {isDraft && (
          <div className="flex items-center gap-1 shrink-0 relative">
            <button
              type="button"
              onClick={() => onOpenExercisePicker(category.publicId)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/20 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden xs:inline sm:inline">Exercício</span>
            </button>

            {/* Menu [...] */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsCategoryMenuOpen(!isCategoryMenuOpen)}
                aria-label="Ações do treino"
                className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)] transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center cursor-pointer"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {isCategoryMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setIsCategoryMenuOpen(false)}
                  />
                  <div className="absolute right-0 top-full mt-1.5 w-48 rounded-2xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xl z-40 py-1.5 text-xs font-semibold text-[var(--text-primary)] divide-y divide-[var(--border-subtle)] animate-in fade-in zoom-in-95 duration-100">
                    <div className="p-1 space-y-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          setIsCategoryMenuOpen(false);
                          setTitleDraft(category.title || "");
                          setIsEditingTitle(true);
                        }}
                        className="w-full px-3 py-2 rounded-xl hover:bg-[var(--surface-subtle)] flex items-center gap-2 text-left cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Renomear treino</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setIsCategoryMenuOpen(false);
                          startTransition(() => onDuplicateCategory(category.publicId));
                        }}
                        className="w-full px-3 py-2 rounded-xl hover:bg-[var(--surface-subtle)] flex items-center gap-2 text-left cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5 text-blue-500" />
                        <span>Duplicar treino</span>
                      </button>
                    </div>

                    <div className="p-1 space-y-0.5">
                      <button
                        type="button"
                        disabled={categoryIndex === 0}
                        onClick={() => {
                          setIsCategoryMenuOpen(false);
                          startTransition(() => onMoveCategoryUp(categoryIndex));
                        }}
                        className="w-full px-3 py-2 rounded-xl hover:bg-[var(--surface-subtle)] flex items-center gap-2 text-left disabled:opacity-40 cursor-pointer"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                        <span>Mover para cima</span>
                      </button>

                      <button
                        type="button"
                        disabled={categoryIndex === totalCategories - 1}
                        onClick={() => {
                          setIsCategoryMenuOpen(false);
                          startTransition(() => onMoveCategoryDown(categoryIndex));
                        }}
                        className="w-full px-3 py-2 rounded-xl hover:bg-[var(--surface-subtle)] flex items-center gap-2 text-left disabled:opacity-40 cursor-pointer"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                        <span>Mover para baixo</span>
                      </button>
                    </div>

                    <div className="p-1">
                      <button
                        type="button"
                        onClick={() => {
                          setIsCategoryMenuOpen(false);
                          if (
                            confirm(
                              `Excluir treino "${categoryTitle}" e todos os seus exercícios?`
                            )
                          ) {
                            startTransition(() => onDeleteCategory(category.publicId));
                          }
                        }}
                        className="w-full px-3 py-2 rounded-xl hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center gap-2 text-left cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Excluir treino</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Content Area: Sub-Blocks or Flat Exercise List */}
      <div className="p-3 sm:p-5 space-y-4">
        {/* Scenario A: Has Sub-blocks (Grupos) */}
        {hasSubBlocks ? (
          <div className="space-y-4">
            {sortedSubBlocks.map((subBlock, sbIdx) => {
              const subBlockItems = items.filter(
                (i) => i.subBlockPublicId === subBlock.publicId
              );

              return (
                <div
                  key={subBlock.publicId}
                  className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)]/30 p-3 sm:p-4 space-y-3 transition-all"
                >
                  {/* Sub-block Header */}
                  <div className="flex items-center justify-between gap-2 pb-2 border-b border-[var(--border-subtle)]">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {editingSubBlockId === subBlock.publicId && isDraft ? (
                        <div className="flex items-center gap-1.5 flex-1 max-w-xs">
                          <input
                            type="text"
                            value={subBlockTitleDraft}
                            onChange={(e) => setSubBlockTitleDraft(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveSubBlockTitle(subBlock.publicId);
                              if (e.key === "Escape") setEditingSubBlockId(null);
                            }}
                            autoFocus
                            placeholder="Nome do grupo (ex: Bíceps)"
                            className="w-full px-2.5 py-1 text-xs font-bold rounded-lg border border-emerald-500 bg-[var(--surface)] text-[var(--text-primary)] focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveSubBlockTitle(subBlock.publicId)}
                            className="p-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 min-h-[28px] min-w-[28px] flex items-center justify-center shrink-0 cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                          <h3
                            onClick={() => {
                              if (isDraft) {
                                setEditingSubBlockId(subBlock.publicId);
                                setSubBlockTitleDraft(subBlock.title);
                              }
                            }}
                            className={`text-xs sm:text-sm font-bold text-[var(--text-primary)] truncate ${
                              isDraft ? "cursor-pointer hover:text-emerald-600 transition-colors" : ""
                            }`}
                            title={isDraft ? "Clique para renomear grupo" : undefined}
                          >
                            {subBlock.title}
                          </h3>
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[var(--surface)] border border-[var(--border-subtle)] text-[var(--text-secondary)] shrink-0">
                            {subBlockItems.length} {subBlockItems.length === 1 ? "exercício" : "exercícios"}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* SubBlock Actions */}
                    {isDraft && (
                      <div className="flex items-center gap-1 shrink-0 relative">
                        <button
                          type="button"
                          onClick={() => onOpenExercisePicker(category.publicId, subBlock.publicId)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/20 transition-colors cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          <span className="hidden xs:inline">Exercício</span>
                        </button>

                        <div className="relative">
                          <button
                            type="button"
                            onClick={() =>
                              setActiveSubBlockMenuId(
                                activeSubBlockMenuId === subBlock.publicId ? null : subBlock.publicId
                              )
                            }
                            aria-label="Ações do grupo"
                            className="p-1 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] transition-colors cursor-pointer"
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>

                          {activeSubBlockMenuId === subBlock.publicId && (
                            <>
                              <div
                                className="fixed inset-0 z-30"
                                onClick={() => setActiveSubBlockMenuId(null)}
                              />
                              <div className="absolute right-0 top-full mt-1 w-44 rounded-2xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xl z-40 py-1.5 text-xs font-semibold text-[var(--text-primary)] divide-y divide-[var(--border-subtle)] animate-in fade-in zoom-in-95 duration-100">
                                <div className="p-1 space-y-0.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveSubBlockMenuId(null);
                                      setEditingSubBlockId(subBlock.publicId);
                                      setSubBlockTitleDraft(subBlock.title);
                                    }}
                                    className="w-full px-3 py-1.5 rounded-xl hover:bg-[var(--surface-subtle)] flex items-center gap-2 text-left cursor-pointer"
                                  >
                                    <Edit2 className="w-3.5 h-3.5 text-emerald-500" />
                                    <span>Renomear</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveSubBlockMenuId(null);
                                      if (onDuplicateSubBlock) {
                                        startTransition(() => onDuplicateSubBlock(subBlock.publicId));
                                      }
                                    }}
                                    className="w-full px-3 py-1.5 rounded-xl hover:bg-[var(--surface-subtle)] flex items-center gap-2 text-left cursor-pointer"
                                  >
                                    <Copy className="w-3.5 h-3.5 text-blue-500" />
                                    <span>Duplicar grupo</span>
                                  </button>
                                </div>

                                <div className="p-1 space-y-0.5">
                                  <button
                                    type="button"
                                    disabled={sbIdx === 0}
                                    onClick={() => {
                                      setActiveSubBlockMenuId(null);
                                      if (onMoveSubBlockUp) {
                                        startTransition(() => onMoveSubBlockUp(category.publicId, sbIdx));
                                      }
                                    }}
                                    className="w-full px-3 py-1.5 rounded-xl hover:bg-[var(--surface-subtle)] flex items-center gap-2 text-left disabled:opacity-40 cursor-pointer"
                                  >
                                    <ArrowUp className="w-3.5 h-3.5" />
                                    <span>Mover para cima</span>
                                  </button>
                                  <button
                                    type="button"
                                    disabled={sbIdx === sortedSubBlocks.length - 1}
                                    onClick={() => {
                                      setActiveSubBlockMenuId(null);
                                      if (onMoveSubBlockDown) {
                                        startTransition(() => onMoveSubBlockDown(category.publicId, sbIdx));
                                      }
                                    }}
                                    className="w-full px-3 py-1.5 rounded-xl hover:bg-[var(--surface-subtle)] flex items-center gap-2 text-left disabled:opacity-40 cursor-pointer"
                                  >
                                    <ArrowDown className="w-3.5 h-3.5" />
                                    <span>Mover para baixo</span>
                                  </button>
                                </div>

                                <div className="p-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveSubBlockMenuId(null);
                                      if (
                                        confirm(
                                          `Excluir grupo "${subBlock.title}" e todos os seus ${subBlockItems.length} exercício(s)?`
                                        )
                                      ) {
                                        if (onDeleteSubBlock) {
                                          startTransition(() => onDeleteSubBlock(subBlock.publicId));
                                        }
                                      }
                                    }}
                                    className="w-full px-3 py-1.5 rounded-xl hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center gap-2 text-left cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>Excluir grupo</span>
                                  </button>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Exercises within SubBlock */}
                  <div className="space-y-2">
                    {subBlockItems.length === 0 ? (
                      <div className="py-4 px-3 text-center rounded-xl border border-dashed border-[var(--border-subtle)] bg-[var(--surface)] text-[11px] text-[var(--text-tertiary)]">
                        Nenhum exercício neste grupo ainda.
                      </div>
                    ) : (
                      subBlockItems.map((item, itemIdx) => {
                        const isExpanded = expandedExerciseId === item.publicId;
                        return (
                          <ExerciseRow
                            key={item.publicId}
                            item={item}
                            itemIndex={itemIdx}
                            totalItems={subBlockItems.length}
                            isExpanded={isExpanded}
                            isDraft={isDraft}
                            categoryPublicId={category.publicId}
                            allCategories={allCategories}
                            onToggleExpand={() =>
                              setExpandedExerciseId(isExpanded ? null : item.publicId)
                            }
                            onCloseExpand={() => setExpandedExerciseId(null)}
                            isMenuOpen={activeExerciseMenuId === item.publicId}
                            onToggleMenu={() =>
                              setActiveExerciseMenuId(
                                activeExerciseMenuId === item.publicId ? null : item.publicId
                              )
                            }
                            onCloseMenu={() => setActiveExerciseMenuId(null)}
                            isMovingOpen={movingExerciseId === item.publicId}
                            onOpenMove={() => setMovingExerciseId(item.publicId)}
                            onCloseMove={() => setMovingExerciseId(null)}
                            onDuplicate={() => onDuplicateExercise(item.publicId)}
                            onDelete={() => onDeleteExercise(item.publicId)}
                            onMoveUp={() => onMoveExerciseUp(category.publicId, itemIdx)}
                            onMoveDown={() => onMoveExerciseDown(category.publicId, itemIdx)}
                            onMoveToCategory={(targetCatId) =>
                              onMoveExerciseToCategory(item.publicId, targetCatId)
                            }
                            onSaveQuickConfig={(cfg) =>
                              onUpdateExerciseQuickConfig(item.publicId, cfg)
                            }
                            onResolve={() => onResolveExercise?.(item.publicId)}
                          />
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}

            {/* Unassigned Items (if any items were created without subBlock, render cleanly) */}
            {items.some(
              (i) => !i.subBlockPublicId || !sortedSubBlocks.some((sb) => sb.publicId === i.subBlockPublicId)
            ) && (
              <div className="space-y-2 pt-2 border-t border-dashed border-[var(--border-subtle)]">
                {items
                  .filter(
                    (i) =>
                      !i.subBlockPublicId ||
                      !sortedSubBlocks.some((sb) => sb.publicId === i.subBlockPublicId)
                  )
                  .map((item, itemIdx, arr) => {
                    const isExpanded = expandedExerciseId === item.publicId;
                    return (
                      <ExerciseRow
                        key={item.publicId}
                        item={item}
                        itemIndex={itemIdx}
                        totalItems={arr.length}
                        isExpanded={isExpanded}
                        isDraft={isDraft}
                        categoryPublicId={category.publicId}
                        allCategories={allCategories}
                        onToggleExpand={() =>
                          setExpandedExerciseId(isExpanded ? null : item.publicId)
                        }
                        onCloseExpand={() => setExpandedExerciseId(null)}
                        isMenuOpen={activeExerciseMenuId === item.publicId}
                        onToggleMenu={() =>
                          setActiveExerciseMenuId(
                            activeExerciseMenuId === item.publicId ? null : item.publicId
                          )
                        }
                        onCloseMenu={() => setActiveExerciseMenuId(null)}
                        isMovingOpen={movingExerciseId === item.publicId}
                        onOpenMove={() => setMovingExerciseId(item.publicId)}
                        onCloseMove={() => setMovingExerciseId(null)}
                        onDuplicate={() => onDuplicateExercise(item.publicId)}
                        onDelete={() => onDeleteExercise(item.publicId)}
                        onMoveUp={() => onMoveExerciseUp(category.publicId, itemIdx)}
                        onMoveDown={() => onMoveExerciseDown(category.publicId, itemIdx)}
                        onMoveToCategory={(targetCatId) =>
                          onMoveExerciseToCategory(item.publicId, targetCatId)
                        }
                        onSaveQuickConfig={(cfg) =>
                          onUpdateExerciseQuickConfig(item.publicId, cfg)
                        }
                        onResolve={() => onResolveExercise?.(item.publicId)}
                      />
                    );
                  })}
              </div>
            )}
          </div>
        ) : (
          /* Scenario B: Flat list (No Sub-blocks) - 100% Backward Compatible */
          <div className="space-y-2.5">
            {items.length === 0 ? (
              <div className="py-6 px-4 text-center rounded-2xl border border-dashed border-[var(--border-default)] bg-[var(--surface-subtle)]/40 space-y-2">
                <p className="text-xs font-semibold text-[var(--text-secondary)]">
                  Nenhum exercício adicionado neste treino ainda.
                </p>
                {isDraft && (
                  <button
                    type="button"
                    onClick={() => onOpenExercisePicker(category.publicId)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar primeiro exercício</span>
                  </button>
                )}
              </div>
            ) : (
              items.map((item, itemIdx) => {
                const isExpanded = expandedExerciseId === item.publicId;
                return (
                  <ExerciseRow
                    key={item.publicId}
                    item={item}
                    itemIndex={itemIdx}
                    totalItems={items.length}
                    isExpanded={isExpanded}
                    isDraft={isDraft}
                    categoryPublicId={category.publicId}
                    allCategories={allCategories}
                    onToggleExpand={() =>
                      setExpandedExerciseId(isExpanded ? null : item.publicId)
                    }
                    onCloseExpand={() => setExpandedExerciseId(null)}
                    isMenuOpen={activeExerciseMenuId === item.publicId}
                    onToggleMenu={() =>
                      setActiveExerciseMenuId(
                        activeExerciseMenuId === item.publicId ? null : item.publicId
                      )
                    }
                    onCloseMenu={() => setActiveExerciseMenuId(null)}
                    isMovingOpen={movingExerciseId === item.publicId}
                    onOpenMove={() => setMovingExerciseId(item.publicId)}
                    onCloseMove={() => setMovingExerciseId(null)}
                    onDuplicate={() => onDuplicateExercise(item.publicId)}
                    onDelete={() => onDeleteExercise(item.publicId)}
                    onMoveUp={() => onMoveExerciseUp(category.publicId, itemIdx)}
                    onMoveDown={() => onMoveExerciseDown(category.publicId, itemIdx)}
                    onMoveToCategory={(targetCatId) =>
                      onMoveExerciseToCategory(item.publicId, targetCatId)
                    }
                    onSaveQuickConfig={(cfg) =>
                      onUpdateExerciseQuickConfig(item.publicId, cfg)
                    }
                    onResolve={() => onResolveExercise?.(item.publicId)}
                  />
                );
              })
            )}
          </div>
        )}

        {/* Footer Actions inside Category */}
        {isDraft && (
          <div className="space-y-2 pt-2">
            {isCreatingSubBlock ? (
              <div className="p-3.5 rounded-2xl border border-emerald-500/40 bg-emerald-500/5 space-y-2 animate-in fade-in duration-150">
                <label className="block text-xs font-bold text-[var(--text-primary)]">
                  Novo Grupo (Sub-bloco)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newSubBlockTitle}
                    onChange={(e) => setNewSubBlockTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCreateSubBlockSubmit();
                      if (e.key === "Escape") {
                        setIsCreatingSubBlock(false);
                        setNewSubBlockTitle("");
                      }
                    }}
                    autoFocus
                    placeholder="Ex: Bíceps, Tríceps, Mobilidade..."
                    className="flex-1 px-3 py-2 text-xs sm:text-sm font-semibold rounded-xl border border-[var(--border-default)] bg-[var(--surface)] text-[var(--text-primary)] focus:ring-2 focus:ring-emerald-500 focus:outline-none min-h-[40px]"
                  />
                  <button
                    type="button"
                    onClick={handleCreateSubBlockSubmit}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors min-h-[40px] cursor-pointer"
                  >
                    Adicionar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreatingSubBlock(false);
                      setNewSubBlockTitle("");
                    }}
                    className="px-3 py-2 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] min-h-[40px] cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => onOpenExercisePicker(category.publicId)}
                  className="flex-1 py-2.5 sm:py-3 px-4 rounded-xl sm:rounded-2xl border border-dashed border-emerald-500/40 hover:border-emerald-500 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all min-h-[42px] cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Adicionar exercício</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsCreatingSubBlock(true)}
                  className="py-2.5 sm:py-3 px-4 rounded-xl sm:rounded-2xl border border-dashed border-[var(--border-default)] hover:border-emerald-500/60 bg-[var(--surface-subtle)] hover:bg-[var(--surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all min-h-[42px] cursor-pointer"
                  title="Criar divisão intermediária (ex: Bíceps, Tríceps)"
                >
                  <Plus className="w-4 h-4 text-emerald-600" />
                  <span>Adicionar grupo</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

type ExerciseRowProps = {
  item: WorkoutBlockItemDto;
  itemIndex: number;
  totalItems: number;
  isExpanded: boolean;
  isDraft: boolean;
  categoryPublicId: string;
  allCategories: { publicId: string; title: string }[];
  onToggleExpand: () => void;
  onCloseExpand: () => void;
  isMenuOpen: boolean;
  onToggleMenu: () => void;
  onCloseMenu: () => void;
  isMovingOpen: boolean;
  onOpenMove: () => void;
  onCloseMove: () => void;
  onDuplicate: () => Promise<void>;
  onDelete: () => Promise<void>;
  onMoveUp: () => Promise<void>;
  onMoveDown: () => Promise<void>;
  onMoveToCategory: (targetCategoryPublicId: string) => Promise<void>;
  onSaveQuickConfig: (config: QuickConfigInput) => Promise<void>;
  onResolve?: () => void;
};

function ExerciseRow({
  item,
  itemIndex,
  totalItems,
  isExpanded,
  isDraft,
  categoryPublicId,
  allCategories,
  onToggleExpand,
  onCloseExpand,
  isMenuOpen,
  onToggleMenu,
  onCloseMenu,
  isMovingOpen,
  onOpenMove,
  onCloseMove,
  onDuplicate,
  onDelete,
  onMoveUp,
  onMoveDown,
  onMoveToCategory,
  onSaveQuickConfig,
  onResolve,
}: ExerciseRowProps) {
  const sets = item.sets || [];
  const initialSeriesCount = sets.length > 0 ? sets.length : 4;
  const initialDuration = sets[0]?.targetDurationSeconds ?? null;
  const initialIsDuration =
    initialDuration != null &&
    initialDuration > 0 &&
    (!sets[0]?.targetReps || sets[0]?.targetReps === 0);
  const initialReps = sets[0]?.targetReps ?? 10;
  const initialRepsMax = sets[0]?.targetRepsMax ?? null;
  const initialRepsText =
    initialRepsMax && initialRepsMax > initialReps
      ? `${initialReps}-${initialRepsMax}`
      : String(initialReps || 10);
  const initialRest = sets[0]?.targetRestSeconds ?? 60;
  const initialLoad = sets[0]?.targetLoadKg ?? null;
  const initialNotes = item.notes || "";

  // Duration unit: default to item.durationUnit, or derive naturally
  const initialUnit: "SECONDS" | "MINUTES" =
    item.durationUnit === "SECONDS" || item.durationUnit === "MINUTES"
      ? item.durationUnit
      : initialDuration && initialDuration < 60
      ? "SECONDS"
      : "MINUTES";

  const [seriesCount, setSeriesCount] = useState<number>(initialSeriesCount);
  const [isDurationBased, setIsDurationBased] = useState<boolean>(initialIsDuration);
  const [durationUnit, setDurationUnit] = useState<"SECONDS" | "MINUTES">(initialUnit);
  const [repsInput, setRepsInput] = useState<string>(initialRepsText);
  const [durationValue, setDurationValue] = useState<number>(
    initialDuration
      ? initialUnit === "MINUTES"
        ? Math.max(1, Math.round(initialDuration / 60))
        : initialDuration
      : 30
  );
  const [restSeconds, setRestSeconds] = useState<number>(initialRest);
  const [loadKg, setLoadKg] = useState<string>(initialLoad != null ? String(initialLoad) : "");
  const [notes, setNotes] = useState<string>(initialNotes);
  const [isExecutionModalOpen, setIsExecutionModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSaveAndClose() {
    startTransition(async () => {
      const parsedReps = parseRepsInput(repsInput);
      const isDuration = isDurationBased || Boolean(parsedReps?.durationSeconds);

      let effectiveDuration: number | null = null;
      let effectiveUnit: "SECONDS" | "MINUTES" | null = null;

      if (isDuration) {
        if (parsedReps?.durationSeconds) {
          effectiveDuration = parsedReps.durationSeconds;
          effectiveUnit = parsedReps.durationSeconds >= 60 && parsedReps.durationSeconds % 60 === 0 ? "MINUTES" : "SECONDS";
        } else {
          effectiveUnit = durationUnit;
          effectiveDuration =
            durationUnit === "MINUTES"
              ? Math.max(1, Math.round(durationValue * 60))
              : Math.max(1, Math.round(durationValue));
        }
      }

      const intensity = parsedReps?.intensityIndicator || null;
      const baseNote = notes.trim();
      const combinedNotes = intensity
        ? baseNote
          ? `${baseNote} • ${intensity}`
          : intensity
        : baseNote || null;

      await onSaveQuickConfig({
        seriesCount: Math.max(1, Math.min(20, seriesCount || 3)),
        reps: isDuration ? null : (parsedReps?.repsMin ?? (intensity ? null : 10)),
        targetRepsMax: isDuration ? null : (parsedReps?.repsMax ?? null),
        targetDurationSeconds: effectiveDuration,
        durationUnit: effectiveUnit,
        restSeconds: Math.max(0, restSeconds ?? 60),
        loadKg: loadKg.trim() !== "" && !isNaN(Number(loadKg)) ? Number(loadKg) : null,
        notes: combinedNotes,
      });
      onCloseExpand();
    });
  }

  const repsOrDurationText = initialIsDuration
    ? formatDurationNatural(initialDuration, item.durationUnit)
    : formatRepetitionRange(initialReps, initialRepsMax);

  const summaryLine = `${initialSeriesCount} ${initialSeriesCount === 1 ? "série" : "séries"} • ${repsOrDurationText} • ${initialRest}s${
    initialLoad != null ? ` • ${initialLoad} kg` : ""
  }`;

  const isUnmatched = !item.exercisePublicId;

  return (
    <div
      className={`rounded-2xl border transition-all ${
        isUnmatched
          ? "border-amber-500/40 bg-amber-500/5 hover:border-amber-500/60"
          : isExpanded
          ? "border-emerald-500 bg-[var(--surface)] shadow-md ring-2 ring-emerald-500/20"
          : "border-[var(--border-default)] bg-[var(--surface-sunken)]/60 hover:bg-[var(--surface)] hover:border-[var(--border-strong)]"
      }`}
    >
      {/* Compact Header Row */}
      <div
        onClick={() => {
          if (isDraft) onToggleExpand();
        }}
        className={`p-2.5 sm:p-3 flex items-start sm:items-center justify-between gap-2.5 ${
          isDraft ? "cursor-pointer" : ""
        }`}
      >
        <div className="min-w-0 flex-1 space-y-1">
          {/* Line 1: Exercise Name & Status Badges */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 min-w-0">
              <h3 className="text-xs sm:text-sm font-bold text-[var(--text-primary)] truncate max-w-[220px] sm:max-w-none">
                {item.exerciseNameSnapshot}
              </h3>
              {isUnmatched && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 whitespace-nowrap shrink-0">
                  ⚠ Precisa revisar
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {isUnmatched && isDraft && onResolve && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onResolve();
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] sm:text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-xs shrink-0 cursor-pointer"
                  title="Vincular a um exercício da biblioteca"
                >
                  Resolver
                </button>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExecutionModalOpen(true);
                }}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] sm:text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 transition-colors shrink-0 cursor-pointer"
                title={`Ver execução de ${item.exerciseNameSnapshot}`}
              >
                <span>▶</span>
                <span className="hidden xs:inline sm:inline">Ver execução</span>
                <span className="xs:hidden sm:hidden">Execução</span>
              </button>
            </div>
          </div>

          {/* Line 2: Prescription Summary */}
          <div className="flex items-center gap-2 text-[11px] sm:text-xs text-[var(--text-secondary)] font-medium">
            <span>{summaryLine}</span>
            {item.muscleGroupSnapshot && (
              <>
                <span className="opacity-40">•</span>
                <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] truncate">
                  {item.muscleGroupSnapshot}
                </span>
              </>
            )}
          </div>

          {/* Line 3: Optional notes preview */}
          {item.notes && (
            <p className="text-[10px] sm:text-[11px] text-[var(--text-tertiary)] italic line-clamp-1">
              Obs: {item.notes}
            </p>
          )}
        </div>

        {/* Action Controls */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1 shrink-0 relative"
        >
          {isDraft && (
            <>
              <button
                type="button"
                disabled={itemIndex === 0 || isPending}
                onClick={() => startTransition(() => onMoveUp())}
                aria-label="Mover exercício para cima"
                className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] disabled:opacity-30 disabled:pointer-events-none transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center cursor-pointer"
                title="Mover para cima"
              >
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                disabled={itemIndex === totalItems - 1 || isPending}
                onClick={() => startTransition(() => onMoveDown())}
                aria-label="Mover exercício para baixo"
                className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] disabled:opacity-30 disabled:pointer-events-none transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center cursor-pointer"
                title="Mover para baixo"
              >
                <ArrowDown className="w-3.5 h-3.5" />
              </button>

              <div className="relative">
                <button
                  type="button"
                  onClick={onToggleMenu}
                  aria-label="Opções do exercício"
                  className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center cursor-pointer"
                >
                  <MoreVertical className="w-3.5 h-3.5" />
                </button>

                {isMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={onCloseMenu} />
                    <div className="absolute right-0 top-full mt-1 w-44 rounded-2xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xl z-40 py-1.5 text-xs font-semibold text-[var(--text-primary)] divide-y divide-[var(--border-subtle)] animate-in fade-in zoom-in-95 duration-100">
                      <div className="p-1 space-y-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            onCloseMenu();
                            onToggleExpand();
                          }}
                          className="w-full px-3 py-1.5 rounded-xl hover:bg-[var(--surface-subtle)] flex items-center gap-2 text-left cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-emerald-500" />
                          <span>{isExpanded ? "Fechar edição" : "Editar"}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            onCloseMenu();
                            startTransition(() => onDuplicate());
                          }}
                          className="w-full px-3 py-1.5 rounded-xl hover:bg-[var(--surface-subtle)] flex items-center gap-2 text-left cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5 text-blue-500" />
                          <span>Duplicar</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            onCloseMenu();
                            onOpenMove();
                          }}
                          className="w-full px-3 py-1.5 rounded-xl hover:bg-[var(--surface-subtle)] flex items-center gap-2 text-left cursor-pointer"
                        >
                          <MoveIcon className="w-3.5 h-3.5 text-amber-500" />
                          <span>Mover treino</span>
                        </button>
                      </div>

                      <div className="p-1">
                        <button
                          type="button"
                          onClick={() => {
                            onCloseMenu();
                            if (confirm(`Remover "${item.exerciseNameSnapshot}"?`)) {
                              startTransition(() => onDelete());
                            }
                          }}
                          className="w-full px-3 py-1.5 rounded-xl hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center gap-2 text-left cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remover</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Expanded Quick Editor */}
      {isExpanded && isDraft && (
        <div className="px-3.5 sm:px-5 pb-4 pt-2 border-t border-[var(--border-subtle)] bg-[var(--surface-subtle)]/50 space-y-3.5 animate-in fade-in duration-150">
          {/* Mode Switch: Repetições ↕ Tempo */}
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-[var(--border-subtle)] flex-wrap">
            <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase">
              Tipo de Meta
            </span>
            <button
              type="button"
              onClick={() => setIsDurationBased(!isDurationBased)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors cursor-pointer border border-emerald-500/20"
            >
              <span>{isDurationBased ? "Tempo" : "Repetições"}</span>
              <span className="text-emerald-500 font-extrabold">↕</span>
              <span className="text-[10px] text-[var(--text-tertiary)] font-medium">
                {isDurationBased ? "Mudar para repetições" : "Mudar para tempo"}
              </span>
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-[var(--text-secondary)] uppercase">
                Séries
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={seriesCount}
                onChange={(e) => setSeriesCount(parseInt(e.target.value, 10) || 1)}
                className="w-full px-3 py-2 text-xs sm:text-sm font-bold text-center rounded-xl border border-[var(--border-default)] bg-[var(--surface)] text-[var(--text-primary)] focus:ring-2 focus:ring-emerald-500 focus:outline-none min-h-[40px]"
              />
            </div>

            {isDurationBased ? (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-bold text-[var(--text-secondary)] uppercase">
                    Tempo
                  </label>
                  <div className="inline-flex rounded-lg p-0.5 bg-[var(--surface-sunken)] border border-[var(--border-subtle)]">
                    <button
                      type="button"
                      onClick={() => {
                        if (durationUnit !== "SECONDS") {
                          setDurationUnit("SECONDS");
                          setDurationValue((prev) => Math.max(5, Math.round(prev * 60)));
                        }
                      }}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                        durationUnit === "SECONDS"
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      }`}
                    >
                      Seg
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (durationUnit !== "MINUTES") {
                          setDurationUnit("MINUTES");
                          setDurationValue((prev) => Math.max(1, Math.round(prev / 60)));
                        }
                      }}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                        durationUnit === "MINUTES"
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      }`}
                    >
                      Min
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    min={durationUnit === "MINUTES" ? 1 : 5}
                    max={durationUnit === "MINUTES" ? 120 : 3600}
                    step={durationUnit === "MINUTES" ? 1 : 5}
                    value={durationValue}
                    onChange={(e) => setDurationValue(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3 pr-10 py-2 text-xs sm:text-sm font-bold text-center rounded-xl border border-[var(--border-default)] bg-[var(--surface)] text-[var(--text-primary)] focus:ring-2 focus:ring-emerald-500 focus:outline-none min-h-[40px]"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[var(--text-tertiary)] pointer-events-none font-bold">
                    {durationUnit === "MINUTES" ? "min" : "s"}
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-bold text-[var(--text-secondary)] uppercase">
                    Repetições
                  </label>
                  <span className="text-[10px] text-[var(--text-tertiary)]">Ex: 8-12</span>
                </div>
                <input
                  type="text"
                  value={repsInput}
                  onChange={(e) => setRepsInput(e.target.value)}
                  placeholder="Ex: 8-12 ou 10"
                  className="w-full px-3 py-2 text-xs sm:text-sm font-bold text-center rounded-xl border border-[var(--border-default)] bg-[var(--surface)] text-[var(--text-primary)] focus:ring-2 focus:ring-emerald-500 focus:outline-none min-h-[40px]"
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-[var(--text-secondary)] uppercase">
                Descanso
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  max={600}
                  step={5}
                  value={restSeconds}
                  onChange={(e) => setRestSeconds(parseInt(e.target.value, 10) || 0)}
                  className="w-full px-3 pr-7 py-2 text-xs sm:text-sm font-bold text-center rounded-xl border border-[var(--border-default)] bg-[var(--surface)] text-[var(--text-primary)] focus:ring-2 focus:ring-emerald-500 focus:outline-none min-h-[40px]"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[var(--text-tertiary)] pointer-events-none font-bold">
                  s
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-[var(--text-secondary)] uppercase">
                Carga (kg) <span className="font-normal text-[10px] text-[var(--text-tertiary)]">(opcional)</span>
              </label>
              <input
                type="number"
                step="0.5"
                value={loadKg}
                onChange={(e) => setLoadKg(e.target.value)}
                placeholder="Ex: 20"
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface)] text-[var(--text-primary)] focus:ring-2 focus:ring-emerald-500 focus:outline-none min-h-[40px]"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-[var(--text-secondary)] uppercase">
                Observação <span className="font-normal text-[10px] text-[var(--text-tertiary)]">(opcional)</span>
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Pegada aberta, cadência controlada"
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface)] text-[var(--text-primary)] focus:ring-2 focus:ring-emerald-500 focus:outline-none min-h-[40px]"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onCloseExpand}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)] min-h-[36px] cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={handleSaveAndClose}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-xs min-h-[36px] cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isPending ? "Salvando..." : "Concluir"}</span>
            </button>
          </div>
        </div>
      )}

      {/* Modal / Dialog: Move to another category */}
      {isMovingOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl bg-[var(--surface)] border border-[var(--border-default)] shadow-2xl p-5 space-y-4">
            <div className="space-y-1">
              <h3 className="text-sm font-extrabold text-[var(--text-primary)]">
                Mover Exercício
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">
                Selecione o treino de destino para{" "}
                <span className="font-bold text-[var(--text-primary)]">
                  {item.exerciseNameSnapshot}
                </span>
                :
              </p>
            </div>

            <div className="space-y-1 max-h-56 overflow-y-auto">
              {allCategories
                .filter((cat) => cat.publicId !== categoryPublicId)
                .map((cat) => (
                  <button
                    key={cat.publicId}
                    type="button"
                    onClick={() => {
                      onCloseMove();
                      startTransition(() => onMoveToCategory(cat.publicId));
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-subtle)] hover:border-emerald-500 bg-[var(--surface-subtle)] hover:bg-emerald-500/10 text-left text-xs font-bold text-[var(--text-primary)] transition-all flex items-center justify-between cursor-pointer"
                  >
                    <span>{cat.title}</span>
                    <span className="text-[10px] text-emerald-600 font-semibold">Mover →</span>
                  </button>
                ))}
              {allCategories.filter((cat) => cat.publicId !== categoryPublicId).length === 0 && (
                <p className="text-xs text-[var(--text-tertiary)] py-4 text-center">
                  Não há outros treinos nesta ficha.
                </p>
              )}
            </div>

            <div className="pt-2 border-t border-[var(--border-subtle)] flex justify-end">
              <button
                type="button"
                onClick={onCloseMove}
                className="px-4 py-2 rounded-xl text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exercise Execution Modal */}
      <ExerciseExecutionModal
        isOpen={isExecutionModalOpen}
        onClose={() => setIsExecutionModalOpen(false)}
        exerciseName={item.exerciseNameSnapshot}
        exercisePublicId={item.exercisePublicId}
        pinnedMedia={item.pinnedMedia}
        customVideoUrl={item.customVideoUrl}
        instructions={item.instructionsSnapshot}
      />
    </div>
  );
}
