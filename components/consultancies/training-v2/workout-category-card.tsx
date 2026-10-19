"use client";

import { useState, useTransition, useMemo, useRef, useCallback, useEffect } from "react";
import type {
  WorkoutBlockDto,
  WorkoutBlockItemDto,
  WorkoutItemCombinationDto,
  WorkoutCombinationType,
} from "@/lib/training-v2/types";
import type { QuickConfigInput } from "@/lib/training-v2/workout-repository";
import { ExerciseExecutionModal } from "./exercise-execution-modal";
import {
  parseRepsInput,
  formatRepetitionRange,
  formatDurationNatural,
} from "@/lib/training-v2/reps-normalizer";
import { BottomSheet } from "@/components/ui/design-system";
import {
  detectExerciseSequenceFromText,
  type DetectedMovement,
} from "@/lib/training-v2/sequence-detector";
import {
  buildSequenceMediaFromCustomItem,
  buildSequenceMediaFromCombination,
} from "@/lib/training-v2/sequence-media";
import { SequenceExecutionModal } from "./sequence-execution-modal";
import { ExerciseVideoEditorSection } from "./exercise-video-editor-section";
import {
  getCombinationTheme,
  COMBINATION_THEMES,
  type CombinationVisualTheme,
} from "./training-studio-tokens";
import { GuidedCombinationModal } from "./guided-combination-modal";
import { addExerciseItemToBlockAction, createCustomExerciseAction } from "@/app/consultoria/[slug]/rotinas/actions";
import type { CustomExerciseFormData } from "./custom-exercise-inline-modal";
import type { WorkoutRootDto, WorkoutVersionDto } from "@/lib/training-v2/types";
import { TrainingStudioAssistant } from "./training-studio-assistant";
import { BlockOrderModal, type ReorderEntry } from "./block-order-modal";

export function parseActiveRest(title?: string | null): { isActive: boolean; activity: string } {
  if (!title) return { isActive: false, activity: "" };
  const match = title.match(/Descanso Ativo:\s*([^•]+)/i) || title.match(/Ativo:\s*([^•]+)/i);
  if (match) {
    return { isActive: true, activity: match[1].trim() };
  }
  return { isActive: false, activity: "" };
}

export function formatActiveRestTitle(
  isRestActive: boolean,
  activityName: string,
  userCustomTitle?: string
): string | undefined {
  if (userCustomTitle && userCustomTitle.trim()) {
    if (isRestActive && activityName.trim()) {
      return `${userCustomTitle.trim()} • Descanso Ativo: ${activityName.trim()}`;
    }
    return userCustomTitle.trim();
  }
  if (isRestActive && activityName.trim()) {
    return `Descanso Ativo: ${activityName.trim()}`;
  }
  return undefined;
}

function ZapIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

function Link2Icon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
  );
}

function ClockIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

export const COMBINATION_TYPE_LABELS: Record<WorkoutCombinationType, string> = {
  BI_SET: "Bi-Set",
  TRI_SET: "Tri-Set",
  SUPERSET: "Super-Série",
  GIANT_SET: "Série Gigante",
  CIRCUIT: "Circuito",
};

export const COMBINATION_BADGE_STYLES: Record<WorkoutCombinationType, string> = {
  BI_SET: COMBINATION_THEMES.BI_SET.badgeClass,
  TRI_SET: COMBINATION_THEMES.TRI_SET.badgeClass,
  SUPERSET: COMBINATION_THEMES.SUPERSET.badgeClass,
  GIANT_SET: COMBINATION_THEMES.GIANT_SET.badgeClass,
  CIRCUIT: COMBINATION_THEMES.CIRCUIT.badgeClass,
};

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

function Minus({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
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

function ArrowUpDown({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m10 4v12m0 0l4-4m-4 4l-4-4" />
    </svg>
  );
}

function MoveIcon({ className = "w-4 h-4" }: { className?: string }) {
  return <ArrowUpDown className={className} />;
}

function Check({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function SearchIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function SparklesIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.286L13 21l-2.286-6.857L5 12l5.714-2.286L13 3z" />
    </svg>
  );
}

function VideoIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <polygon points="23 7 16 12 23 17 23 7" />
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
  );
}

function AlertCircle({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" strokeLinecap="round" />
      <line x1="12" y1="16" x2="12.01" y2="16" strokeLinecap="round" />
    </svg>
  );
}

export type CategoryCardProps = {
  category: WorkoutBlockDto;
  categoryIndex: number;
  totalCategories: number;
  allCategories: { publicId: string; title: string }[];
  isDraft: boolean;
  consultancySlug?: string;
  onOpenExercisePicker: (categoryPublicId: string, subBlockPublicId?: string) => void;
  onRenameCategory: (categoryPublicId: string, newTitle: string) => Promise<void>;
  onDuplicateCategory: (categoryPublicId: string) => Promise<void>;
  onDeleteCategory: (categoryPublicId: string) => Promise<void>;
  onMoveCategoryUp: (categoryIndex: number) => Promise<void>;
  onMoveCategoryDown: (categoryIndex: number) => Promise<void>;
  onMoveCategoryStart?: (categoryIndex: number) => Promise<void> | void;
  onMoveCategoryEnd?: (categoryIndex: number) => Promise<void> | void;
  onMoveCategoryToPosition?: (categoryIndex: number, targetPos: number) => Promise<void> | void;
  onDuplicateExercise: (itemPublicId: string) => Promise<void>;
  onMoveExerciseToCategory: (itemPublicId: string, targetCategoryPublicId: string) => Promise<void>;
  onDeleteExercise: (itemPublicId: string) => Promise<void>;
  onMoveExerciseUp: (categoryPublicId: string, itemIndex: number) => Promise<void>;
  onMoveExerciseDown: (categoryPublicId: string, itemIndex: number) => Promise<void>;
  onReorderExercises?: (categoryPublicId: string, itemPublicIds: string[]) => Promise<void>;
  onUpdateExerciseQuickConfig: (itemPublicId: string, config: QuickConfigInput) => Promise<void>;
  // Sub-blocks (Grupos)
  onCreateSubBlock?: (categoryPublicId: string, title: string) => Promise<void>;
  onRenameSubBlock?: (subBlockPublicId: string, newTitle: string) => Promise<void>;
  onDuplicateSubBlock?: (subBlockPublicId: string) => Promise<void>;
  onDeleteSubBlock?: (subBlockPublicId: string) => Promise<void>;
  onMoveSubBlockUp?: (categoryPublicId: string, subBlockIndex: number) => Promise<void>;
  onMoveSubBlockDown?: (categoryPublicId: string, subBlockIndex: number) => Promise<void>;
  onResolveExercise?: (itemPublicId: string) => void;
  // Combinations (Bi-set, Tri-set, Super-série, etc.)
  onCreateCombination?: (input: {
    blockPublicId: string;
    subBlockPublicId?: string;
    combinationType: WorkoutCombinationType;
    title?: string;
    restAfterSeconds?: number;
    itemPublicIds: string[];
  }) => Promise<void>;
  onUpdateCombination?: (
    combinationPublicId: string,
    input: {
      combinationType?: WorkoutCombinationType;
      title?: string;
      restAfterSeconds?: number;
    }
  ) => Promise<void>;
  onUngroupCombination?: (combinationPublicId: string) => Promise<void>;
  onDeleteCombination?: (combinationPublicId: string, deleteItems?: boolean) => Promise<void>;
  onDuplicateCombination?: (combinationPublicId: string) => Promise<void>;
  onMoveItemInCombination?: (
    combinationPublicId: string,
    itemPublicId: string,
    direction: "up" | "down"
  ) => Promise<void>;
  onRemoveItemFromCombination?: (
    combinationPublicId: string,
    itemPublicId: string
  ) => Promise<void>;
  onOpenCreateCustomExercise?: (
    categoryPublicId: string,
    subBlockPublicId?: string,
    convertingItemPublicId?: string,
    initialData?: { name?: string; muscleGroup?: string; equipment?: string }
  ) => void;
  onOpenConfigureSequence?: (
    item: WorkoutBlockItemDto,
    movements: DetectedMovement[]
  ) => void;
  workout?: WorkoutRootDto;
  version?: WorkoutVersionDto;
  categories?: WorkoutBlockDto[];
  onOpenPublishDialog?: () => void;
  onCreateDraft?: () => void;
};

type ContainerEntry =
  | { type: "combination"; combination: WorkoutItemCombinationDto; sortOrder: number }
  | { type: "item"; item: WorkoutBlockItemDto; sortOrder: number };

function buildContainerEntries(
  items: WorkoutBlockItemDto[],
  combinations: WorkoutItemCombinationDto[],
  subBlockPublicId: string | null
): ContainerEntry[] {
  const normSubBlock = subBlockPublicId || null;

  // Set of all active combinations
  const activeCombinationIds = new Set((combinations || []).map((c) => c.publicId));

  // Combinations for this container: matching subBlock OR containing items from this container
  const containerCombinations = (combinations || []).filter((c) => {
    const matchesSb = (c.subBlockPublicId || null) === normSubBlock;
    const hasItemsInContainer = items.some((i) => i.combinationPublicId === c.publicId);
    return matchesSb || hasItemsInContainer;
  });

  const combMap = new Map<string, WorkoutItemCombinationDto>();
  for (const c of containerCombinations) {
    const matchedItems = items.filter((i) => i.combinationPublicId === c.publicId);
    const fallbackItems = c.items && c.items.length > 0 ? c.items : [];
    const combItems = (matchedItems.length > 0 ? matchedItems : fallbackItems).slice();
    combItems.sort((a, b) => a.sortOrder - b.sortOrder);

    combMap.set(c.publicId, {
      ...c,
      items: combItems,
    });
  }

  // IRONCLAD: An item is standalone ONLY if it has no active combination
  const standaloneItems = items.filter(
    (i) => !i.combinationPublicId || !activeCombinationIds.has(i.combinationPublicId)
  );

  const entries: ContainerEntry[] = [];

  for (const item of standaloneItems) {
    entries.push({ type: "item", item, sortOrder: item.sortOrder });
  }

  for (const comb of combMap.values()) {
    const minOrder =
      comb.items && comb.items.length > 0
        ? Math.min(...comb.items.map((it) => it.sortOrder))
        : (comb.sortOrder ?? 1);
    entries.push({ type: "combination", combination: comb, sortOrder: minOrder });
  }

  entries.sort((a, b) => a.sortOrder - b.sortOrder);
  return entries;
}

// ============================================================================
// STICKY BOTTOM COMBINATION ACTION BAR (MOBILE-FIRST)
// ============================================================================

function CombinationFloatingActionBar({
  selectedCount,
  combinationType,
  restSeconds,
  isRestActive,
  activeRestActivity,
  onChangeType,
  onChangeRest,
  onToggleRestActive,
  onChangeActiveRestActivity,
  onConfirm,
  onCancel,
  targetName,
}: {
  selectedCount: number;
  combinationType: WorkoutCombinationType;
  restSeconds: number;
  isRestActive: boolean;
  activeRestActivity: string;
  onChangeType: (type: WorkoutCombinationType) => void;
  onChangeRest: (rest: number) => void;
  onToggleRestActive: (active: boolean) => void;
  onChangeActiveRestActivity: (act: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  targetName?: string;
}) {
  const ACTIVITY_PRESETS = ["Caminhada leve", "Polichinelo", "Prancha", "Mobilidade"];

  return (
    <div
      data-testid="combination-floating-bar"
      className="fixed bottom-0 inset-x-0 z-50 p-3 sm:p-4 pb-[calc(0.85rem+env(safe-area-inset-bottom,0px))] bg-[var(--surface)]/95 dark:bg-[var(--surface)]/95 backdrop-blur-md border-t-2 border-emerald-500 shadow-[0_-8px_30px_rgba(0,0,0,0.22)] animate-in slide-in-from-bottom duration-200"
    >
      <div className="max-w-4xl mx-auto space-y-3">
        {/* Top Header / Count & Target */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="text-xs sm:text-sm font-extrabold text-[var(--text-primary)]">
              {selectedCount === 0
                ? "Toque nos cards dos exercícios para combinar"
                : selectedCount === 1
                ? "1 exercício selecionado • Toque no 2º exercício"
                : `${selectedCount} exercícios selecionados • ${COMBINATION_TYPE_LABELS[combinationType]}`}
            </span>
            {targetName && (
              <span className="hidden sm:inline-block text-[11px] font-semibold text-[var(--text-tertiary)] px-2 py-0.5 rounded-full bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
                {targetName}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Cancelar combinação"
            className="px-3 py-1.5 rounded-xl text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] transition-colors cursor-pointer min-h-[44px] sm:min-h-[36px] flex items-center gap-1"
          >
            <span>✕ Cancelar</span>
          </button>
        </div>

        {/* Controls Row: Type Selector Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none w-full">
          {(["BI_SET", "TRI_SET", "SUPERSET", "GIANT_SET", "CIRCUIT"] as WorkoutCombinationType[]).map((t) => {
            const isActive = combinationType === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => onChangeType(t)}
                aria-pressed={isActive}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all min-h-[44px] sm:min-h-[40px] flex items-center gap-1 cursor-pointer shrink-0 ${
                  isActive
                    ? `${COMBINATION_THEMES[t]?.selectorActiveClass || "bg-blue-600 text-white shadow-sm ring-2 ring-blue-500/40"} scale-102`
                    : "bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] border border-[var(--border-default)]"
                }`}
              >
                <span>{COMBINATION_TYPE_LABELS[t]}</span>
                {t === "BI_SET" && <span className="opacity-80 text-[10px]">(2)</span>}
                {t === "TRI_SET" && <span className="opacity-80 text-[10px]">(3)</span>}
                {t === "GIANT_SET" && <span className="opacity-80 text-[10px]">(4+)</span>}
              </button>
            );
          })}
        </div>

        {/* Rest Mode Selection: Passivo vs Ativo + Stepper */}
        <div className="space-y-2 p-2.5 rounded-2xl bg-[var(--surface-subtle)]/70 border border-[var(--border-default)]">
          <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
            {/* Passivo vs Ativo Toggle */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase mr-1">
                Descanso:
              </span>
              <button
                type="button"
                onClick={() => onToggleRestActive(false)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold min-h-[40px] transition-all cursor-pointer ${
                  !isRestActive
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border-subtle)]"
                }`}
              >
                ⏸️ Passivo
              </button>
              <button
                type="button"
                onClick={() => onToggleRestActive(true)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold min-h-[40px] transition-all cursor-pointer ${
                  isRestActive
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border-subtle)]"
                }`}
              >
                🏃 Ativo
              </button>
            </div>

            {/* Stepper for duration */}
            <div className="flex items-center gap-2 bg-[var(--surface)] px-2.5 py-1 rounded-xl border border-[var(--border-default)] shrink-0">
              <button
                type="button"
                onClick={() => onChangeRest(Math.max(0, restSeconds - 15))}
                aria-label="Diminuir descanso em 15s"
                className="w-10 h-10 rounded-lg bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-[var(--text-primary)] border border-[var(--border-subtle)] font-black text-lg flex items-center justify-center transition-colors cursor-pointer min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px]"
              >
                <Minus className="w-4 h-4" />
              </button>
              <div className="w-14 text-center">
                <span className="text-sm font-extrabold text-[var(--text-primary)]">{restSeconds}</span>
                <span className="text-[10px] font-bold text-[var(--text-secondary)] ml-0.5">s</span>
              </div>
              <button
                type="button"
                onClick={() => onChangeRest(Math.min(600, restSeconds + 15))}
                aria-label="Aumentar descanso em 15s"
                className="w-10 h-10 rounded-lg bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-[var(--text-primary)] border border-[var(--border-subtle)] font-black text-lg flex items-center justify-center transition-colors cursor-pointer min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px]"
              >
                +
              </button>
            </div>
          </div>

          {/* If Active Rest: Activity input & quick suggestions */}
          {isRestActive && (
            <div className="pt-1 space-y-1.5 animate-in fade-in duration-150">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={activeRestActivity}
                  onChange={(e) => onChangeActiveRestActivity(e.target.value)}
                  placeholder="Atividade (ex: Caminhada leve, polichinelo...)"
                  className="flex-1 px-3 py-2 text-xs sm:text-sm font-bold rounded-xl border border-[var(--border-default)] bg-[var(--surface)] text-[var(--text-primary)] min-h-[44px] focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {ACTIVITY_PRESETS.map((act) => (
                  <button
                    key={act}
                    type="button"
                    onClick={() => onChangeActiveRestActivity(act)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer min-h-[32px] ${
                      activeRestActivity === act
                        ? "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40 font-bold"
                        : "bg-[var(--surface)] text-[var(--text-secondary)] border-[var(--border-subtle)]"
                    }`}
                  >
                    {act}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* CTA Buttons */}
        <div className="flex items-center gap-2 pt-0.5">
          <button
            type="button"
            disabled={selectedCount < 2}
            onClick={onConfirm}
            className={`flex-1 py-3 px-5 rounded-2xl ${
              selectedCount < 2
                ? "bg-emerald-600 hover:bg-emerald-700"
                : COMBINATION_THEMES[combinationType]?.selectorActiveClass || "bg-blue-600 hover:bg-blue-500"
            } text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer min-h-[48px]`}
          >
            <ZapIcon className="w-4 h-4 shrink-0" />
            <span>
              {selectedCount < 2
                ? "Selecione 2+ exercícios para agrupar"
                : `Agrupar em ${COMBINATION_TYPE_LABELS[combinationType]} (${selectedCount})`}
            </span>
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="py-3 px-4 rounded-2xl border border-[var(--border-default)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] font-bold text-xs sm:text-sm transition-colors cursor-pointer min-h-[48px] shrink-0"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

export function WorkoutCategoryCard({
  category,
  categoryIndex,
  totalCategories,
  allCategories,
  isDraft,
  consultancySlug,
  onOpenExercisePicker,
  onRenameCategory,
  onDuplicateCategory,
  onDeleteCategory,
  onMoveCategoryUp,
  onMoveCategoryDown,
  onMoveCategoryStart,
  onMoveCategoryEnd,
  onMoveCategoryToPosition,
  onDuplicateExercise,
  onMoveExerciseToCategory,
  onDeleteExercise,
  onMoveExerciseUp,
  onMoveExerciseDown,
  onReorderExercises,
  onUpdateExerciseQuickConfig,
  onCreateSubBlock,
  onRenameSubBlock,
  onDuplicateSubBlock,
  onDeleteSubBlock,
  onMoveSubBlockUp,
  onMoveSubBlockDown,
  onResolveExercise,
  onCreateCombination,
  onUpdateCombination,
  onUngroupCombination,
  onDeleteCombination,
  onMoveItemInCombination,
  onRemoveItemFromCombination,
  onOpenCreateCustomExercise,
  onOpenConfigureSequence,
  workout,
  version,
  categories,
  onOpenPublishDialog,
  onCreateDraft,
}: CategoryCardProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(category.title || "");
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
  const [isOrganizeOrderModalOpen, setIsOrganizeOrderModalOpen] = useState(false);
  const [expandedExerciseId, setExpandedExerciseId] = useState<string | null>(null);
  const [activeExerciseMenuId, setActiveExerciseMenuId] = useState<string | null>(null);
  const [movingExerciseId, setMovingExerciseId] = useState<string | null>(null);

  // Sub-block management state
  const [isCreatingSubBlock, setIsCreatingSubBlock] = useState(false);
  const [newSubBlockTitle, setNewSubBlockTitle] = useState("");
  const [editingSubBlockId, setEditingSubBlockId] = useState<string | null>(null);
  const [subBlockTitleDraft, setSubBlockTitleDraft] = useState("");
  const [activeSubBlockMenuId, setActiveSubBlockMenuId] = useState<string | null>(null);

  // Combination selection & menu state
  const [combiningSubBlockId, setCombiningSubBlockId] = useState<string | null>(null);
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<string[]>([]);
  const [newCombType, setNewCombType] = useState<WorkoutCombinationType>("BI_SET");
  const [newCombRest, setNewCombRest] = useState<number>(60);
  const [isCombRestActive, setIsCombRestActive] = useState<boolean>(false);
  const [combRestActivity, setCombRestActivity] = useState<string>("");
  const [activeAddMenuSubBlockId, setActiveAddMenuSubBlockId] = useState<string | null>(null);

  // Guided Combination & Assistant States (Training Studio 3.1)
  const [guidedModalState, setGuidedModalState] = useState<{
    isOpen: boolean;
    type: WorkoutCombinationType;
    initialItem: WorkoutBlockItemDto | null;
    subBlockPublicId?: string;
  }>({
    isOpen: false,
    type: "BI_SET",
    initialItem: null,
  });

  const [isAssistantOpen, setIsAssistantOpen] = useState(false);

  function handleStartGuidedCombination(
    type: WorkoutCombinationType,
    item: WorkoutBlockItemDto | null,
    subBlockPublicId?: string
  ) {
    setGuidedModalState({
      isOpen: true,
      type,
      initialItem: item,
      subBlockPublicId,
    });
  }

  async function handleConfirmGuidedCombination(
    combType: WorkoutCombinationType,
    itemPublicIds: string[],
    rounds: number,
    restSeconds: number
  ) {
    if (!onCreateCombination) return;
    await onCreateCombination({
      blockPublicId: category.publicId,
      subBlockPublicId: guidedModalState.subBlockPublicId,
      combinationType: combType,
      restAfterSeconds: restSeconds,
      itemPublicIds,
    });
    setGuidedModalState({
      isOpen: false,
      type: "BI_SET",
      initialItem: null,
    });
  }

  async function handleAddAndCombineItem(exercisePublicId: string) {
    if (!consultancySlug) return null;
    const res = await addExerciseItemToBlockAction(
      consultancySlug,
      category.publicId,
      exercisePublicId,
      undefined,
      guidedModalState.subBlockPublicId
    );
    if (res.ok && res.data) {
      return res.data;
    }
    return null;
  }

  async function handleCreateCustomAndCombineItem(data: CustomExerciseFormData) {
    if (!consultancySlug) return null;
    const res = await createCustomExerciseAction(consultancySlug, category.publicId, {
      name: data.name,
      muscleGroup: data.muscleGroup,
      equipment: data.equipment,
      instructions: data.instructions,
      subBlockPublicId: guidedModalState.subBlockPublicId,
      customVideoUrl: data.videoUrl,
      mediaAssetPublicId: data.videoKey,
      saveToLibrary: data.saveToMyLibrary,
      notes: data.notes,
      isSequence: data.isSequence || data.type === "SEQUENCE",
      sequenceMovements: data.sequenceMovements,
      sets: [
        {
          setType: "NORMAL",
          targetReps: parseInt(data.reps || "10", 10) || 10,
          targetLoadKg: data.load ? parseFloat(data.load.replace(",", ".")) || undefined : undefined,
          targetRestSeconds: data.restSeconds ? Number(data.restSeconds) : 60,
        },
      ],
    });
    if (res.ok && res.data) {
      return res.data;
    }
    return null;
  }

  // Mobile Bottom Sheets & Modals state
  const [quickEditingItem, setQuickEditingItem] = useState<WorkoutBlockItemDto | null>(null);
  const [editingCombination, setEditingCombination] = useState<WorkoutItemCombinationDto | null>(null);
  const [mobileAddSheetTarget, setMobileAddSheetTarget] = useState<{
    isOpen: boolean;
    subBlockPublicId?: string;
  }>({ isOpen: false });
  const [actionsSheetItem, setActionsSheetItem] = useState<{
    item: WorkoutBlockItemDto;
    index: number;
    total: number;
    subBlockPublicId?: string;
    combinationPublicId?: string;
  } | null>(null);
  const [executionModalItem, setExecutionModalItem] = useState<WorkoutBlockItemDto | null>(null);

  const [, startTransition] = useTransition();

  const items = category.items || [];
  const categoryTitle = category.title || `Treino ${categoryIndex + 1}`;
  const subBlocks = category.subBlocks || [];
  const combinations = category.combinations || [];
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

  function handleToggleSelectExercise(itemPublicId: string) {
    setSelectedExerciseIds((prev) => {
      const exists = prev.includes(itemPublicId);
      const next = exists ? prev.filter((id) => id !== itemPublicId) : [...prev, itemPublicId];
      if (next.length === 2) setNewCombType("BI_SET");
      else if (next.length === 3) setNewCombType("TRI_SET");
      else if (next.length >= 4) setNewCombType("GIANT_SET");
      return next;
    });
  }

  function handleCombineFromHere(itemPublicId: string, subBlockId?: string) {
    setCombiningSubBlockId(subBlockId ?? "root");
    setSelectedExerciseIds([itemPublicId]);
    setNewCombType("BI_SET");
  }

  function handleConfirmCreateCombination(targetSubBlockId?: string) {
    if (selectedExerciseIds.length < 2 || !onCreateCombination) return;
    const formattedTitle = formatActiveRestTitle(isCombRestActive, combRestActivity);
    startTransition(async () => {
      await onCreateCombination({
        blockPublicId: category.publicId,
        subBlockPublicId: targetSubBlockId,
        combinationType: newCombType,
        title: formattedTitle,
        restAfterSeconds: newCombRest,
        itemPublicIds: selectedExerciseIds,
      });
      setCombiningSubBlockId(null);
      setSelectedExerciseIds([]);
      setIsCombRestActive(false);
      setCombRestActivity("");
    });
  }

  // Reorder entries (standalone exercises or whole combination blocks)
  function handleMoveEntryInContainer(
    containerEntries: ContainerEntry[],
    entryIdx: number,
    direction: "up" | "down" | "start" | "end" | number,
    subBlockPublicId?: string | null
  ) {
    let targetIdx: number;
    if (direction === "up") {
      targetIdx = entryIdx - 1;
    } else if (direction === "down") {
      targetIdx = entryIdx + 1;
    } else if (direction === "start") {
      targetIdx = 0;
    } else if (direction === "end") {
      targetIdx = containerEntries.length - 1;
    } else if (typeof direction === "number") {
      targetIdx = Math.max(0, Math.min(containerEntries.length - 1, direction));
    } else {
      return;
    }

    if (targetIdx < 0 || targetIdx >= containerEntries.length || targetIdx === entryIdx) return;

    const newEntries = [...containerEntries];
    const [moved] = newEntries.splice(entryIdx, 1);
    newEntries.splice(targetIdx, 0, moved);

    // Flatten new entries into item public IDs
    const reorderedContainerItemIds: string[] = [];
    for (const entry of newEntries) {
      if (entry.type === "item") {
        reorderedContainerItemIds.push(entry.item.publicId);
      } else {
        const cItems = entry.combination.items || [];
        for (const cit of cItems) {
          reorderedContainerItemIds.push(cit.publicId);
        }
      }
    }

    let allBlockItemIds: string[];
    if (hasSubBlocks && subBlockPublicId) {
      const fullList: string[] = [];
      for (const sb of sortedSubBlocks) {
        if (sb.publicId === subBlockPublicId) {
          fullList.push(...reorderedContainerItemIds);
        } else {
          const otherItems = items.filter((i) => i.subBlockPublicId === sb.publicId);
          fullList.push(...otherItems.map((i) => i.publicId));
        }
      }
      const unassigned = items.filter((i) => !i.subBlockPublicId);
      fullList.push(...unassigned.map((i) => i.publicId));
      allBlockItemIds = fullList;
    } else {
      allBlockItemIds = reorderedContainerItemIds;
    }

    if (onReorderExercises) {
      startTransition(async () => {
        await onReorderExercises(category.publicId, allBlockItemIds);
      });
    }
  }

  return (
    <div className="space-y-4 pb-6 border-b border-[var(--border-subtle)] last:border-b-0 w-full max-w-full min-w-0">
      {/* Category Header */}
      <div className="space-y-3 pb-3 border-b border-[var(--border-subtle)] w-full max-w-full min-w-0">
        <div className="flex items-center justify-between gap-2.5 sm:gap-3 w-full">
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
              <div className="min-w-0 flex-1 space-y-0.5">
                <h2
                  onClick={() => {
                    if (isDraft) {
                      setTitleDraft(category.title || "");
                      setIsEditingTitle(true);
                    }
                  }}
                  className={`text-base sm:text-lg font-black uppercase tracking-tight text-[var(--text-primary)] break-words line-clamp-2 ${
                    isDraft ? "cursor-pointer hover:text-emerald-600 transition-colors" : ""
                  }`}
                  title={isDraft ? "Clique para renomear" : undefined}
                >
                  {categoryTitle}
                </h2>
                <div className="text-xs text-[var(--text-secondary)] font-medium flex items-center gap-1.5 flex-wrap">
                  <span>{items.length} {items.length === 1 ? "exercício" : "exercícios"}</span>
                  {combinations.length > 0 && <span>· {combinations.length} {combinations.length === 1 ? "combinação" : "combinações"}</span>}
                  {hasSubBlocks && <span>· {subBlocks.length} {subBlocks.length === 1 ? "grupo" : "grupos"}</span>}
                </div>
              </div>
            )}
          </div>

          {/* Block Menu [...] on Mobile & Desktop */}
          <div className="flex items-center gap-1.5 shrink-0 relative">
            {/* Kept sr-only for accessibility/testids */}
            <button
              type="button"
              data-testid="category-assistant-btn"
              onClick={() => setIsAssistantOpen(true)}
              aria-label={isDraft ? "Assistente de Montagem" : "Assistente de Treino"}
              className="sr-only"
              title={isDraft ? "Abrir Assistente Inteligente de Montagem" : "Abrir Assistente Inteligente de Prescrição"}
            >
              <SparklesIcon className="w-3.5 h-3.5 text-emerald-500" />
              <span>Assistente</span>
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => setIsCategoryMenuOpen(!isCategoryMenuOpen)}
                aria-label="Ações do treino"
                className="p-2 sm:p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] border border-[var(--border-subtle)] transition-all min-h-[44px] min-w-[44px] sm:min-h-[38px] sm:min-w-[38px] flex items-center justify-center cursor-pointer hover:scale-[1.01] active:scale-[0.98]"
                title="Mais opções do treino"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

            {isCategoryMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setIsCategoryMenuOpen(false)}
                />
                <div className="absolute right-0 top-full mt-1.5 w-52 rounded-2xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xl z-40 py-1.5 text-xs font-semibold text-[var(--text-primary)] divide-y divide-[var(--border-subtle)] animate-in fade-in zoom-in-95 duration-100">
                  <div className="p-1 space-y-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setIsCategoryMenuOpen(false);
                        setIsAssistantOpen(true);
                      }}
                      className="w-full px-3 py-2 rounded-xl hover:bg-[var(--surface-subtle)] flex items-center gap-2 text-left cursor-pointer"
                    >
                      <SparklesIcon className="w-3.5 h-3.5 text-emerald-500" />
                      <span>{isDraft ? "Assistente de montagem" : "Assistente de treino"}</span>
                    </button>

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

                      {onCreateCombination && !hasSubBlocks && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsCategoryMenuOpen(false);
                            setCombiningSubBlockId(combiningSubBlockId === "root" ? null : "root");
                            setSelectedExerciseIds([]);
                          }}
                          className="w-full px-3 py-2 rounded-xl hover:bg-[var(--surface-subtle)] flex items-center gap-2 text-left cursor-pointer"
                        >
                          <ZapIcon className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{combiningSubBlockId === "root" ? "Cancelar modo combinar" : "Combinar exercícios"}</span>
                        </button>
                      )}
                    </div>

                    <div className="p-1 space-y-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          setIsCategoryMenuOpen(false);
                          setIsOrganizeOrderModalOpen(true);
                        }}
                        className="w-full px-3 py-2 rounded-xl hover:bg-[var(--surface-subtle)] flex items-center gap-2 text-left cursor-pointer"
                      >
                        <MoveIcon className="w-3.5 h-3.5 text-amber-500" />
                        <span>Organizar ordem</span>
                      </button>

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

                      {onMoveCategoryStart && (
                        <button
                          type="button"
                          disabled={categoryIndex === 0}
                          onClick={() => {
                            setIsCategoryMenuOpen(false);
                            startTransition(() => onMoveCategoryStart(categoryIndex));
                          }}
                          className="w-full px-3 py-2 rounded-xl hover:bg-[var(--surface-subtle)] flex items-center gap-2 text-left disabled:opacity-40 cursor-pointer"
                        >
                          <ArrowUp className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Mover para o início</span>
                        </button>
                      )}

                      {onMoveCategoryEnd && (
                        <button
                          type="button"
                          disabled={categoryIndex === totalCategories - 1}
                          onClick={() => {
                            setIsCategoryMenuOpen(false);
                            startTransition(() => onMoveCategoryEnd(categoryIndex));
                          }}
                          className="w-full px-3 py-2 rounded-xl hover:bg-[var(--surface-subtle)] flex items-center gap-2 text-left disabled:opacity-40 cursor-pointer"
                        >
                          <ArrowDown className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Mover para o final</span>
                        </button>
                      )}

                      {onMoveCategoryToPosition && totalCategories > 1 && (
                        <div className="px-3 py-1.5 flex items-center justify-between gap-2">
                          <span className="text-[11px] text-[var(--text-secondary)] font-medium">Posição:</span>
                          <select
                            value={categoryIndex + 1}
                            onChange={(e) => {
                              setIsCategoryMenuOpen(false);
                              const targetPos = Number(e.target.value) - 1;
                              startTransition(() => onMoveCategoryToPosition(categoryIndex, targetPos));
                            }}
                            className="px-2 py-1 rounded-lg bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-xs font-bold text-[var(--text-primary)] cursor-pointer"
                          >
                            {Array.from({ length: totalCategories }, (_, i) => (
                              <option key={i + 1} value={i + 1}>
                                {i + 1}º de {totalCategories}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
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
        </div>

        {/* Visible Assembly Bar: + Adicionar exercício & ⚡ Criar combinação & ↕ Organizar ordem */}
        {isDraft && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full pt-1">
            <button
              type="button"
              data-testid="category-add-exercise-btn"
              onClick={() => {
                if (typeof window !== "undefined" && window.innerWidth < 768) {
                  setMobileAddSheetTarget({ isOpen: true });
                } else {
                  onOpenExercisePicker(category.publicId);
                }
              }}
              aria-label="Adicionar exercício"
              className="flex-1 min-h-[44px] px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs active:scale-[0.99] transition-all cursor-pointer"
              title="Adicionar exercício a este treino"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Adicionar exercício</span>
            </button>

            {onCreateCombination && (
              <button
                type="button"
                data-testid="category-combine-btn"
                onClick={() => {
                  setGuidedModalState({
                    isOpen: true,
                    type: "BI_SET",
                    initialItem: null,
                  });
                }}
                aria-label="Criar combinação"
                className="flex-1 min-h-[44px] px-3.5 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-white/[0.06] dark:hover:bg-white/[0.1] text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-white/[0.12] font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs active:scale-[0.99] transition-all cursor-pointer"
                title="Criar combinação (Bi-set, Tri-set, Circuito ou Super-série)"
              >
                <ZapIcon className="w-4 h-4 text-amber-500 shrink-0" />
                <span>Criar combinação</span>
              </button>
            )}

            <button
              type="button"
              data-testid="category-organize-order-bar-btn"
              onClick={() => setIsOrganizeOrderModalOpen(true)}
              aria-label="Organizar ordem deste treino"
              className="flex-1 sm:flex-initial min-h-[44px] px-3.5 py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs active:scale-[0.99] transition-all cursor-pointer"
              title="Organizar ordem de execução deste treino"
            >
              <ArrowUpDown className="w-4 h-4 text-amber-500 shrink-0" />
              <span>Organizar ordem</span>
            </button>
          </div>
        )}
      </div>

      {/* Content Area: Sub-Blocks or Flat Exercise List */}
      <div className="space-y-4 pt-1">
        {/* Scenario A: Has Sub-blocks (Grupos) */}
        {hasSubBlocks ? (
          <div className="space-y-4">
            {sortedSubBlocks.map((subBlock, sbIdx) => {
              const subBlockItems = items.filter(
                (i) => i.subBlockPublicId === subBlock.publicId
              );
              const isCombiningThisSb = combiningSubBlockId === subBlock.publicId;
              const entries = buildContainerEntries(
                subBlockItems,
                combinations,
                subBlock.publicId
              );

              return (
                <div
                  key={subBlock.publicId}
                  className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)]/20 p-3 sm:p-3.5 space-y-3 transition-all"
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
                          <span className="text-xs font-semibold text-[var(--text-tertiary)] shrink-0">
                            ({subBlockItems.length} {subBlockItems.length === 1 ? "exercício" : "exercícios"})
                          </span>
                        </div>
                      )}
                    </div>

                    {/* SubBlock Actions — Nível 1: "+ Exercício" e "Combinar" lado a lado */}
                    {isDraft && (
                      <div className="flex items-center gap-1.5 shrink-0 relative">
                        {/* + Exercício Popover */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() =>
                              setActiveAddMenuSubBlockId(
                                activeAddMenuSubBlockId === subBlock.publicId ? null : subBlock.publicId
                              )
                            }
                            aria-label="Adicionar exercício ao grupo"
                            className="inline-flex items-center gap-1 px-2.5 sm:px-2 py-1.5 sm:py-1 rounded-xl text-xs sm:text-[11px] font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/20 transition-colors cursor-pointer min-h-[38px] sm:min-h-[32px] shrink-0"
                          >
                            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span>Exercício</span>
                          </button>

                          {activeAddMenuSubBlockId === subBlock.publicId && (
                            <>
                              <div
                                className="fixed inset-0 z-30"
                                onClick={() => setActiveAddMenuSubBlockId(null)}
                              />
                              <div className="absolute right-0 top-full mt-1.5 w-52 rounded-2xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xl z-40 p-1.5 text-xs font-semibold text-[var(--text-primary)] space-y-1 animate-in fade-in zoom-in-95 duration-100">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveAddMenuSubBlockId(null);
                                    onOpenExercisePicker(category.publicId, subBlock.publicId);
                                  }}
                                  className="w-full px-3 py-2 rounded-xl hover:bg-[var(--surface-subtle)] flex items-center gap-2.5 text-left cursor-pointer"
                                >
                                  <SearchIcon className="w-4 h-4 text-emerald-600" />
                                  <div>
                                    <div className="font-bold">Buscar na biblioteca</div>
                                    <div className="text-[10px] text-[var(--text-tertiary)] font-normal">
                                      Milhares de exercícios catalogados
                                    </div>
                                  </div>
                                </button>

                                {onOpenCreateCustomExercise && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveAddMenuSubBlockId(null);
                                      onOpenCreateCustomExercise(category.publicId, subBlock.publicId);
                                    }}
                                    className="w-full px-3 py-2 rounded-xl hover:bg-[var(--surface-subtle)] flex items-center gap-2.5 text-left cursor-pointer"
                                  >
                                    <SparklesIcon className="w-4 h-4 text-violet-600" />
                                    <div>
                                      <div className="font-bold text-violet-700 dark:text-violet-300">
                                        Criar personalizado
                                      </div>
                                      <div className="text-[10px] text-[var(--text-tertiary)] font-normal">
                                        Fora da biblioteca, com vídeo próprio
                                      </div>
                                    </div>
                                  </button>
                                )}
                              </div>
                            </>
                          )}
                        </div>

                        {/* Combinar Button */}
                        {onCreateCombination && (
                          <button
                            type="button"
                            onClick={() => {
                              setCombiningSubBlockId(isCombiningThisSb ? null : subBlock.publicId);
                              setSelectedExerciseIds([]);
                            }}
                            aria-label={isCombiningThisSb ? "Cancelar modo combinar no grupo" : "Combinar exercícios no grupo"}
                            className={`inline-flex items-center gap-1.5 px-2.5 sm:px-2 py-1.5 sm:py-1 rounded-xl text-xs sm:text-[11px] font-bold transition-colors cursor-pointer border min-h-[38px] sm:min-h-[32px] shrink-0 ${
                              isCombiningThisSb
                                ? "bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/30"
                                : "bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border-[var(--border-default)]"
                            }`}
                            title="Combinar exercícios em Bi-set, Tri-set ou Circuito"
                          >
                            {isCombiningThisSb ? (
                              <>
                                <span className="text-xs font-extrabold leading-none">✕</span>
                                <span>Cancelar</span>
                              </>
                            ) : (
                              <>
                                <ZapIcon className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                <span>Combinar</span>
                              </>
                            )}
                          </button>
                        )}

                        {/* More Menu */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() =>
                              setActiveSubBlockMenuId(
                                activeSubBlockMenuId === subBlock.publicId ? null : subBlock.publicId
                              )
                            }
                            aria-label="Ações do grupo"
                            className="p-2 sm:p-1 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] border border-[var(--border-subtle)] transition-colors cursor-pointer min-h-[38px] min-w-[38px] sm:min-h-[32px] sm:min-w-[32px] flex items-center justify-center shrink-0"
                          >
                            <MoreVertical className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
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

                  {/* Combination Creation Inline Notice */}
                  {isCombiningThisSb && (
                    <div className="p-3 sm:p-3.5 rounded-2xl border-2 border-emerald-500/50 bg-emerald-500/10 flex items-center justify-between gap-3 animate-in fade-in duration-150">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                        <div className="text-xs sm:text-sm font-bold text-[var(--text-primary)]">
                          <span>Modo Combinar: toque nos cards para selecionar </span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">
                            ({selectedExerciseIds.length} selecionados)
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setCombiningSubBlockId(null);
                          setSelectedExerciseIds([]);
                        }}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] transition-colors cursor-pointer shrink-0 min-h-[36px]"
                      >
                        Cancelar
                      </button>
                    </div>
                  )}

                  {/* Entries within SubBlock (Combinations and Standalone Items) */}
                  <div className="space-y-3">
                    {entries.length === 0 ? (
                      <div className="py-4 px-3 text-center rounded-xl border border-dashed border-[var(--border-subtle)] bg-[var(--surface)] text-[11px] text-[var(--text-tertiary)]">
                        Nenhum exercício neste grupo ainda.
                      </div>
                    ) : (
                      entries.map((entry, displayIdx) => {
                        const executionIndex = displayIdx + 1;
                        const activeEntryIdx = displayIdx;

                        if (entry.type === "combination") {
                          return (
                            <UnifiedCombinationBlock
                              key={entry.combination.publicId}
                              combination={entry.combination}
                              categoryPublicId={category.publicId}
                              subBlockPublicId={subBlock.publicId}
                              entryIndex={activeEntryIdx}
                              executionIndex={executionIndex}
                              totalEntries={entries.length}
                              isDraft={isDraft}
                              onMoveEntryUp={() => handleMoveEntryInContainer(entries, activeEntryIdx, "up", subBlock.publicId)}
                              onMoveEntryDown={() => handleMoveEntryInContainer(entries, activeEntryIdx, "down", subBlock.publicId)}
                              onMoveEntryStart={() => handleMoveEntryInContainer(entries, activeEntryIdx, "start", subBlock.publicId)}
                              onMoveEntryEnd={() => handleMoveEntryInContainer(entries, activeEntryIdx, "end", subBlock.publicId)}
                              onMoveEntryToPosition={(pos) => handleMoveEntryInContainer(entries, activeEntryIdx, pos, subBlock.publicId)}
                              onOpenEditCombination={(c) => setEditingCombination(c)}
                              onOpenQuickEdit={(it) => setQuickEditingItem(it)}
                              onOpenActions={(it, idx, tot) =>
                                setActionsSheetItem({
                                  item: it,
                                  index: idx,
                                  total: tot,
                                  subBlockPublicId: subBlock.publicId,
                                  combinationPublicId: entry.combination.publicId,
                                })
                              }
                              onOpenExecutionModal={(it) => setExecutionModalItem(it)}
                              onMoveItemInCombination={onMoveItemInCombination}
                              onRemoveItemFromCombination={onRemoveItemFromCombination}
                              onUngroupCombination={onUngroupCombination}
                              onDeleteCombination={onDeleteCombination}
                            />
                          );
                        }

                        const item = entry.item;
                        const isExpanded = expandedExerciseId === item.publicId;
                        const itemIdx = subBlockItems.findIndex((it) => it.publicId === item.publicId);

                        const handleItemMoveUp = onReorderExercises
                          ? async () => { await handleMoveEntryInContainer(entries, activeEntryIdx, "up", subBlock.publicId); }
                          : () => onMoveExerciseUp(category.publicId, itemIdx);

                        const handleItemMoveDown = onReorderExercises
                          ? async () => { await handleMoveEntryInContainer(entries, activeEntryIdx, "down", subBlock.publicId); }
                          : () => onMoveExerciseDown(category.publicId, itemIdx);

                        const selIdx = selectedExerciseIds.indexOf(item.publicId);
                        const isItemSel = selIdx !== -1;
                        const selectionIndex = isItemSel ? selIdx + 1 : undefined;

                        return (
                          <div key={item.publicId} className="space-y-3">
                            {/* Mobile View: Dedicated MobileExerciseCard */}
                            <div className="md:hidden">
                              <MobileExerciseCard
                                item={item}
                                itemIndex={activeEntryIdx}
                                executionIndex={executionIndex}
                                totalItems={entries.length}
                                isDraft={isDraft}
                                categoryPublicId={category.publicId}
                                allCategories={allCategories}
                                isSelectionMode={isCombiningThisSb}
                                isSelected={isItemSel}
                                selectionIndex={selectionIndex}
                                onToggleSelect={() => handleToggleSelectExercise(item.publicId)}
                                onOpenQuickEdit={() => setQuickEditingItem(item)}
                                onOpenActions={() =>
                                  setActionsSheetItem({
                                    item,
                                    index: activeEntryIdx,
                                    total: entries.length,
                                    subBlockPublicId: subBlock.publicId,
                                  })
                                }
                                onOpenExecutionModal={() => setExecutionModalItem(item)}
                                onOpenConfigureSequence={onOpenConfigureSequence}
                                onMoveUp={handleItemMoveUp}
                                onMoveDown={handleItemMoveDown}
                                onCombineFromHere={() => handleCombineFromHere(item.publicId, subBlock.publicId)}
                              />
                            </div>
                            {/* Desktop View: Preserved ExerciseRow */}
                            <div className="hidden md:block">
                              <ExerciseRow
                                item={item}
                                itemIndex={activeEntryIdx}
                                executionIndex={executionIndex}
                                totalItems={entries.length}
                                isExpanded={isExpanded}
                                isDraft={isDraft}
                                categoryPublicId={category.publicId}
                                allCategories={allCategories}
                                consultancySlug={consultancySlug}
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
                                onMoveUp={handleItemMoveUp}
                                onMoveDown={handleItemMoveDown}
                                onMoveStart={onReorderExercises ? async () => { await handleMoveEntryInContainer(entries, activeEntryIdx, "start", subBlock.publicId); } : undefined}
                                onMoveEnd={onReorderExercises ? async () => { await handleMoveEntryInContainer(entries, activeEntryIdx, "end", subBlock.publicId); } : undefined}
                                onMoveToPosition={onReorderExercises ? async (targetPos: number) => { await handleMoveEntryInContainer(entries, activeEntryIdx, targetPos, subBlock.publicId); } : undefined}
                                onMoveToCategory={(targetCatId) =>
                                  onMoveExerciseToCategory(item.publicId, targetCatId)
                                }
                                onSaveQuickConfig={(cfg) =>
                                  onUpdateExerciseQuickConfig(item.publicId, cfg)
                                }
                                onResolve={() => onResolveExercise?.(item.publicId)}
                                onOpenConvertCustom={() =>
                                  onOpenCreateCustomExercise?.(
                                    category.publicId,
                                    subBlock.publicId,
                                    item.publicId,
                                    {
                                      name: item.exerciseNameSnapshot,
                                      muscleGroup: item.muscleGroupSnapshot || undefined,
                                      equipment: item.equipmentSnapshot || undefined,
                                    }
                                  )
                                }
                                onOpenConfigureSequence={onOpenConfigureSequence}
                                isSelectionMode={isCombiningThisSb}
                                isSelected={isItemSel}
                                selectionIndex={selectionIndex}
                                onToggleSelect={() => handleToggleSelectExercise(item.publicId)}
                                onCombineFromHere={() => handleCombineFromHere(item.publicId, subBlock.publicId)}
                                onStartGuidedCombination={
                                  onCreateCombination
                                    ? (type) => handleStartGuidedCombination(type, item, subBlock.publicId)
                                    : undefined
                                }
                              />
                            </div>
                          </div>
                        );
                      })
                  )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Scenario B: Flat list (No Sub-blocks) */
          <div className="space-y-3">
            {/* Flat Combination Creation Inline Notice */}
            {combiningSubBlockId === "root" && (
              <div className="p-3 sm:p-3.5 rounded-2xl border-2 border-emerald-500/50 bg-emerald-500/10 flex items-center justify-between gap-3 animate-in fade-in duration-150">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <div className="text-xs sm:text-sm font-bold text-[var(--text-primary)]">
                    <span>Modo Combinar: toque nos cards para selecionar </span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">
                      ({selectedExerciseIds.length} selecionados)
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCombiningSubBlockId(null);
                    setSelectedExerciseIds([]);
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] transition-colors cursor-pointer shrink-0 min-h-[36px]"
                >
                  Cancelar
                </button>
              </div>
            )}

            {items.length === 0 ? (
              <div className="py-8 px-4 text-center rounded-2xl border-2 border-dashed border-white/10 bg-white/[0.02] space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-sm">
                  <Plus className="w-6 h-6 stroke-[2.5]" />
                </div>
                <div className="space-y-1 max-w-sm mx-auto">
                  <p className="text-sm font-bold text-white">
                    Nenhum exercício neste treino ainda
                  </p>
                  <p className="text-xs text-zinc-400">
                    Toque no botão abaixo ou clique em &quot;+ Adicionar&quot; na Biblioteca ao lado para montar sua divisão.
                  </p>
                </div>
                {isDraft && (
                  <button
                    type="button"
                    onClick={() => onOpenExercisePicker(category.publicId)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                    <span>Adicionar primeiro exercício</span>
                  </button>
                )}
              </div>
            ) : (
              (() => {
                const flatEntries = buildContainerEntries(items, combinations, null);

                return flatEntries.map((entry, displayIdx) => {
                  const executionIndex = displayIdx + 1;
                  const activeEntryIdx = displayIdx;

                  if (entry.type === "combination") {
                    return (
                      <UnifiedCombinationBlock
                        key={entry.combination.publicId}
                        combination={entry.combination}
                        categoryPublicId={category.publicId}
                        subBlockPublicId={undefined}
                        entryIndex={activeEntryIdx}
                        executionIndex={executionIndex}
                        totalEntries={flatEntries.length}
                        isDraft={isDraft}
                        onMoveEntryUp={() => handleMoveEntryInContainer(flatEntries, activeEntryIdx, "up", null)}
                        onMoveEntryDown={() => handleMoveEntryInContainer(flatEntries, activeEntryIdx, "down", null)}
                        onMoveEntryStart={() => handleMoveEntryInContainer(flatEntries, activeEntryIdx, "start", null)}
                        onMoveEntryEnd={() => handleMoveEntryInContainer(flatEntries, activeEntryIdx, "end", null)}
                        onMoveEntryToPosition={(pos) => handleMoveEntryInContainer(flatEntries, activeEntryIdx, pos, null)}
                        onOpenEditCombination={(c) => setEditingCombination(c)}
                        onOpenQuickEdit={(it) => setQuickEditingItem(it)}
                        onOpenActions={(it, idx, tot) =>
                          setActionsSheetItem({
                            item: it,
                            index: idx,
                            total: tot,
                            combinationPublicId: entry.combination.publicId,
                          })
                        }
                        onOpenExecutionModal={(it) => setExecutionModalItem(it)}
                        onMoveItemInCombination={onMoveItemInCombination}
                        onRemoveItemFromCombination={onRemoveItemFromCombination}
                        onUngroupCombination={onUngroupCombination}
                        onDeleteCombination={onDeleteCombination}
                      />
                    );
                  }

                  const item = entry.item;
                  const isExpanded = expandedExerciseId === item.publicId;
                  const itemIdx = items.findIndex((it) => it.publicId === item.publicId);

                  const handleItemMoveUp = onReorderExercises
                    ? async () => { await handleMoveEntryInContainer(flatEntries, activeEntryIdx, "up", null); }
                    : () => onMoveExerciseUp(category.publicId, itemIdx);

                  const handleItemMoveDown = onReorderExercises
                    ? async () => { await handleMoveEntryInContainer(flatEntries, activeEntryIdx, "down", null); }
                    : () => onMoveExerciseDown(category.publicId, itemIdx);

                  const selIdx = selectedExerciseIds.indexOf(item.publicId);
                  const isItemSel = selIdx !== -1;
                  const selectionIndex = isItemSel ? selIdx + 1 : undefined;

                  return (
                    <div key={item.publicId} className="space-y-3">
                      {/* Mobile View: Dedicated MobileExerciseCard */}
                      <div className="md:hidden">
                        <MobileExerciseCard
                          item={item}
                          itemIndex={activeEntryIdx}
                          executionIndex={executionIndex}
                          totalItems={flatEntries.length}
                          isDraft={isDraft}
                          categoryPublicId={category.publicId}
                          allCategories={allCategories}
                          isSelectionMode={combiningSubBlockId === "root"}
                          isSelected={isItemSel}
                          selectionIndex={selectionIndex}
                          onToggleSelect={() => handleToggleSelectExercise(item.publicId)}
                          onOpenQuickEdit={() => setQuickEditingItem(item)}
                          onOpenActions={() =>
                            setActionsSheetItem({ item, index: activeEntryIdx, total: items.length })
                          }
                          onOpenExecutionModal={() => setExecutionModalItem(item)}
                          onOpenConfigureSequence={onOpenConfigureSequence}
                          onMoveUp={handleItemMoveUp}
                          onMoveDown={handleItemMoveDown}
                          onCombineFromHere={() => handleCombineFromHere(item.publicId, undefined)}
                        />
                      </div>
                      {/* Desktop View: Preserved ExerciseRow */}
                      <div className="hidden md:block">
                        <ExerciseRow
                          item={item}
                          itemIndex={activeEntryIdx}
                          executionIndex={executionIndex}
                          totalItems={flatEntries.length}
                          isExpanded={isExpanded}
                          isDraft={isDraft}
                          categoryPublicId={category.publicId}
                          allCategories={allCategories}
                          consultancySlug={consultancySlug}
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
                          onMoveUp={handleItemMoveUp}
                          onMoveDown={handleItemMoveDown}
                          onMoveStart={onReorderExercises ? async () => { await handleMoveEntryInContainer(flatEntries, activeEntryIdx, "start", null); } : undefined}
                          onMoveEnd={onReorderExercises ? async () => { await handleMoveEntryInContainer(flatEntries, activeEntryIdx, "end", null); } : undefined}
                          onMoveToPosition={onReorderExercises ? async (targetPos: number) => { await handleMoveEntryInContainer(flatEntries, activeEntryIdx, targetPos, null); } : undefined}
                          onMoveToCategory={(targetCatId) =>
                            onMoveExerciseToCategory(item.publicId, targetCatId)
                          }
                          onSaveQuickConfig={(cfg) =>
                            onUpdateExerciseQuickConfig(item.publicId, cfg)
                          }
                          onResolve={() => onResolveExercise?.(item.publicId)}
                          onOpenConvertCustom={() =>
                            onOpenCreateCustomExercise?.(
                              category.publicId,
                              undefined,
                              item.publicId,
                              {
                                name: item.exerciseNameSnapshot,
                                muscleGroup: item.muscleGroupSnapshot || undefined,
                                equipment: item.equipmentSnapshot || undefined,
                              }
                            )
                          }
                          onOpenConfigureSequence={onOpenConfigureSequence}
                          isSelectionMode={combiningSubBlockId === "root"}
                          isSelected={isItemSel}
                          selectionIndex={selectionIndex}
                          onToggleSelect={() => handleToggleSelectExercise(item.publicId)}
                          onCombineFromHere={() => handleCombineFromHere(item.publicId, undefined)}
                          onStartGuidedCombination={
                            onCreateCombination
                              ? (type) => handleStartGuidedCombination(type, item, undefined)
                              : undefined
                          }
                        />
                      </div>
                    </div>
                  );
                });
              })()
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
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors min-h-[40px] cursor-pointer shadow-xs"
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
                  onClick={() => {
                    if (typeof window !== "undefined" && window.innerWidth < 768) {
                      setMobileAddSheetTarget({ isOpen: true });
                    } else {
                      onOpenExercisePicker(category.publicId);
                    }
                  }}
                  className="flex-1 py-3 px-4 rounded-xl sm:rounded-2xl border border-dashed border-emerald-500/40 hover:border-emerald-500 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all min-h-[48px] sm:min-h-[44px] cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Adicionar exercício</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsCreatingSubBlock(true)}
                  className="py-3 px-4 rounded-xl sm:rounded-2xl border border-dashed border-[var(--border-default)] hover:border-emerald-500/60 bg-[var(--surface-subtle)] hover:bg-[var(--surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all min-h-[48px] sm:min-h-[44px] cursor-pointer"
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

      {/* Floating Sticky Bottom Combination Bar (Mobile First) */}
      {combiningSubBlockId !== null && (
        <CombinationFloatingActionBar
          selectedCount={selectedExerciseIds.length}
          combinationType={newCombType}
          restSeconds={newCombRest}
          isRestActive={isCombRestActive}
          activeRestActivity={combRestActivity}
          onChangeType={setNewCombType}
          onChangeRest={setNewCombRest}
          onToggleRestActive={setIsCombRestActive}
          onChangeActiveRestActivity={setCombRestActivity}
          onConfirm={() =>
            handleConfirmCreateCombination(
              combiningSubBlockId === "root" ? undefined : combiningSubBlockId
            )
          }
          onCancel={() => {
            setCombiningSubBlockId(null);
            setSelectedExerciseIds([]);
            setIsCombRestActive(false);
            setCombRestActivity("");
          }}
          targetName={
            combiningSubBlockId === "root"
              ? categoryTitle
              : subBlocks.find((sb) => sb.publicId === combiningSubBlockId)?.title || categoryTitle
          }
        />
      )}

      {/* Mobile Quick Edit Exercise Sheet */}
      {quickEditingItem && (
        <QuickEditExerciseSheet
          isOpen={true}
          item={
            items.find((i) => i.publicId === quickEditingItem.publicId) || quickEditingItem
          }
          consultancySlug={consultancySlug}
          onClose={() => setQuickEditingItem(null)}
          onSave={async (config) => {
            await onUpdateExerciseQuickConfig(quickEditingItem.publicId, config);
          }}
        />
      )}

      {/* Mobile Edit Combination Sheet */}
      {editingCombination && (
        <EditCombinationSheet
          isOpen={true}
          combination={
            combinations.find((c) => c.publicId === editingCombination.publicId) || editingCombination
          }
          onClose={() => setEditingCombination(null)}
          onSave={async (input) => {
            if (onUpdateCombination) {
              await onUpdateCombination(editingCombination.publicId, input);
            }
          }}
          onUngroup={async () => {
            if (onUngroupCombination) {
              await onUngroupCombination(editingCombination.publicId);
            }
            setEditingCombination(null);
          }}
          onMoveItem={onMoveItemInCombination}
          onRemoveItem={onRemoveItemFromCombination}
        />
      )}

      {/* Mobile Add Exercise Sheet */}
      {mobileAddSheetTarget.isOpen && (
        <AddExerciseActionSheet
          isOpen={true}
          onClose={() => setMobileAddSheetTarget({ isOpen: false })}
          onSelectLibrary={() => {
            const subId = mobileAddSheetTarget.subBlockPublicId;
            setMobileAddSheetTarget({ isOpen: false });
            onOpenExercisePicker(category.publicId, subId);
          }}
          onSelectCustom={() => {
            const subId = mobileAddSheetTarget.subBlockPublicId;
            setMobileAddSheetTarget({ isOpen: false });
            onOpenCreateCustomExercise?.(category.publicId, subId);
          }}
          onSelectCombine={
            onCreateCombination
              ? () => {
                  setMobileAddSheetTarget({ isOpen: false });
                  setGuidedModalState({
                    isOpen: true,
                    type: "BI_SET",
                    initialItem: null,
                  });
                }
              : undefined
          }
        />
      )}

      {/* Mobile Exercise Actions Menu Sheet */}
      {actionsSheetItem && (
        <ExerciseActionsSheet
          isOpen={true}
          item={actionsSheetItem.item}
          itemIndex={actionsSheetItem.index}
          totalItems={actionsSheetItem.total}
          allCategories={allCategories}
          categoryPublicId={category.publicId}
          inCombination={Boolean(actionsSheetItem.combinationPublicId)}
          onClose={() => setActionsSheetItem(null)}
          onOpenConfigureSequence={onOpenConfigureSequence ? () => {
            const it = actionsSheetItem.item;
            const det = detectExerciseSequenceFromText(it.exerciseNameSnapshot);
            setActionsSheetItem(null);
            onOpenConfigureSequence(it, det.movements);
          } : undefined}
          onOpenQuickEdit={() => {
            const it = actionsSheetItem.item;
            setActionsSheetItem(null);
            setQuickEditingItem(it);
          }}
          onOpenExecutionModal={() => {
            const it = actionsSheetItem.item;
            setActionsSheetItem(null);
            setExecutionModalItem(it);
          }}
          onDuplicate={async () => {
            const id = actionsSheetItem.item.publicId;
            setActionsSheetItem(null);
            await onDuplicateExercise(id);
          }}
          onDelete={async () => {
            const id = actionsSheetItem.item.publicId;
            setActionsSheetItem(null);
            await onDeleteExercise(id);
          }}
          onMoveUp={async () => {
            const it = actionsSheetItem.item;
            const combId = actionsSheetItem.combinationPublicId;
            setActionsSheetItem(null);
            if (combId && onMoveItemInCombination) {
              await onMoveItemInCombination(combId, it.publicId, "up");
            } else {
              await onMoveExerciseUp(category.publicId, actionsSheetItem.index);
            }
          }}
          onMoveDown={async () => {
            const it = actionsSheetItem.item;
            const combId = actionsSheetItem.combinationPublicId;
            setActionsSheetItem(null);
            if (combId && onMoveItemInCombination) {
              await onMoveItemInCombination(combId, it.publicId, "down");
            } else {
              await onMoveExerciseDown(category.publicId, actionsSheetItem.index);
            }
          }}
          onMoveStart={async () => {
            const subId = actionsSheetItem.subBlockPublicId;
            setActionsSheetItem(null);
            if (onReorderExercises) {
              const entries = hasSubBlocks && subId
                ? buildContainerEntries(items.filter((i) => i.subBlockPublicId === subId), combinations.filter((c) => c.subBlockPublicId === subId), subId)
                : buildContainerEntries(items, combinations, null);
              handleMoveEntryInContainer(entries, actionsSheetItem.index, "start", subId);
            }
          }}
          onMoveEnd={async () => {
            const subId = actionsSheetItem.subBlockPublicId;
            setActionsSheetItem(null);
            if (onReorderExercises) {
              const entries = hasSubBlocks && subId
                ? buildContainerEntries(items.filter((i) => i.subBlockPublicId === subId), combinations.filter((c) => c.subBlockPublicId === subId), subId)
                : buildContainerEntries(items, combinations, null);
              handleMoveEntryInContainer(entries, actionsSheetItem.index, "end", subId);
            }
          }}
          onMoveToPosition={async (targetPos) => {
            const subId = actionsSheetItem.subBlockPublicId;
            setActionsSheetItem(null);
            if (onReorderExercises) {
              const entries = hasSubBlocks && subId
                ? buildContainerEntries(items.filter((i) => i.subBlockPublicId === subId), combinations.filter((c) => c.subBlockPublicId === subId), subId)
                : buildContainerEntries(items, combinations, null);
              handleMoveEntryInContainer(entries, actionsSheetItem.index, targetPos, subId);
            }
          }}
          onMoveToCategory={async (targetCatId) => {
            const id = actionsSheetItem.item.publicId;
            setActionsSheetItem(null);
            await onMoveExerciseToCategory(id, targetCatId);
          }}
          onOpenConvertCustom={() => {
            const it = actionsSheetItem.item;
            const subId = actionsSheetItem.subBlockPublicId;
            setActionsSheetItem(null);
            onOpenCreateCustomExercise?.(
              category.publicId,
              subId,
              it.publicId,
              {
                name: it.exerciseNameSnapshot,
                muscleGroup: it.muscleGroupSnapshot || undefined,
                equipment: it.equipmentSnapshot || undefined,
              }
            );
          }}
          onCombineFromHere={
            onCreateCombination
              ? () => handleCombineFromHere(actionsSheetItem.item.publicId, actionsSheetItem.subBlockPublicId)
              : undefined
          }
          onStartGuidedCombination={
            onCreateCombination
              ? (type) => {
                  const it = actionsSheetItem.item;
                  const subId = actionsSheetItem.subBlockPublicId;
                  setActionsSheetItem(null);
                  handleStartGuidedCombination(type, it, subId);
                }
              : undefined
          }
        />
      )}

      {/* Execution Modal */}
      {executionModalItem && (
        <ExerciseExecutionModal
          isOpen={true}
          onClose={() => setExecutionModalItem(null)}
          exerciseName={executionModalItem.exerciseNameSnapshot}
          exercisePublicId={executionModalItem.exercisePublicId}
          pinnedMedia={executionModalItem.pinnedMedia}
          customVideoUrl={executionModalItem.customVideoUrl}
          instructions={executionModalItem.instructionsSnapshot}
        />
      )}

      {/* Guided Combination Modal (Bi-Set, Tri-Set, Circuit directly from card) */}
      {guidedModalState.isOpen && (
        <GuidedCombinationModal
          key={`${guidedModalState.type}-${guidedModalState.initialItem?.publicId || "new"}`}
          isOpen={guidedModalState.isOpen}
          onClose={() =>
            setGuidedModalState({
              isOpen: false,
              type: "BI_SET",
              initialItem: null,
            })
          }
          type={guidedModalState.type}
          categoryPublicId={category.publicId}
          initialItem={guidedModalState.initialItem}
          categoryItems={items}
          consultancySlug={consultancySlug || ""}
          onConfirmCombination={handleConfirmGuidedCombination}
          onAddAndCombineItem={handleAddAndCombineItem}
          onCreateCustomAndCombineItem={handleCreateCustomAndCombineItem}
          onDeleteTemporaryItem={onDeleteExercise}
        />
      )}

      {/* Training Studio Assistant Modal / Sheet */}
      {isAssistantOpen && (
        <TrainingStudioAssistant
          isOpen={isAssistantOpen}
          onClose={() => setIsAssistantOpen(false)}
          consultancySlug={consultancySlug || ""}
          workout={workout || {
            publicId: "",
            consultancyPublicId: "",
            title: "Ficha de Treino",
            subtitle: null,
            objective: null,
            estimatedDurationMinutes: null,
            difficultyLevel: "BEGINNER",
            isTemplate: false,
            status: "ACTIVE",
            currentPublishedVersion: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          }}
          version={version || {
            publicId: "",
            workoutPublicId: "",
            versionNumber: 1,
            status: isDraft ? "DRAFT" : "PUBLISHED",
            publishedAt: null,
            title: "Versão 1",
            subtitle: null,
            objective: null,
            estimatedDurationMinutes: null,
            difficultyLevel: null,
            notes: null,
            blocks: [category],
            createdAt: new Date(),
            updatedAt: new Date(),
          }}
          categories={categories || [category]}
          selectedCategoryPublicId={category.publicId}
          onOpenExercisePicker={(catId) => onOpenExercisePicker(catId)}
          onOpenCreateCustom={(catId) => onOpenCreateCustomExercise?.(catId)}
          onStartGuidedCombination={(type) => {
            const firstItem = items[0] || null;
            if (firstItem) {
              handleStartGuidedCombination(type, firstItem);
            } else {
              onOpenExercisePicker(category.publicId);
            }
          }}
          onOpenPublishDialog={() => onOpenPublishDialog?.()}
          onCreateDraft={onCreateDraft}
        />
      )}

      {/* Block Order Modal (Organizar Ordem) */}
      {isOrganizeOrderModalOpen && (
        <BlockOrderModal
          isOpen={isOrganizeOrderModalOpen}
          categoryTitle={categoryTitle}
          entries={buildContainerEntries(items, combinations, null) as ReorderEntry[]}
          onClose={() => setIsOrganizeOrderModalOpen(false)}
          onSaveOrder={async (itemPublicIds) => {
            if (onReorderExercises) {
              await onReorderExercises(category.publicId, itemPublicIds);
            }
          }}
        />
      )}
    </div>
  );
}

// ============================================================================
// COMBINATION CARD COMPONENT
// ============================================================================

export type LegacyCombinationCardProps = {
  combination: WorkoutItemCombinationDto;
  categoryPublicId: string;
  subBlockPublicId?: string | null;
  allCategories: { publicId: string; title: string }[];
  isDraft: boolean;
  expandedExerciseId: string | null;
  onToggleExpandExercise: (itemPublicId: string) => void;
  onCloseExpandExercise: () => void;
  activeExerciseMenuId: string | null;
  onToggleExerciseMenu: (itemPublicId: string) => void;
  onCloseExerciseMenu: () => void;
  movingExerciseId: string | null;
  onOpenMoveExercise: (itemPublicId: string) => void;
  onCloseMoveExercise: () => void;
  onDuplicateExercise: (itemPublicId: string) => Promise<void>;
  onDeleteExercise: (itemPublicId: string) => Promise<void>;
  onMoveExerciseToCategory: (itemPublicId: string, targetCatId: string) => Promise<void>;
  onUpdateExerciseQuickConfig: (itemPublicId: string, config: QuickConfigInput) => Promise<void>;
  onResolveExercise?: (itemPublicId: string) => void;
  onOpenCreateCustomExercise?: (
    categoryPublicId: string,
    subBlockPublicId?: string,
    convertingItemPublicId?: string,
    initialData?: { name?: string; muscleGroup?: string; equipment?: string }
  ) => void;
  onUpdateCombination?: (
    combinationPublicId: string,
    input: { combinationType?: WorkoutCombinationType; title?: string; restAfterSeconds?: number }
  ) => Promise<void>;
  onUngroupCombination?: (combinationPublicId: string) => Promise<void>;
  onDeleteCombination?: (combinationPublicId: string, deleteItems?: boolean) => Promise<void>;
  onDuplicateCombination?: (combinationPublicId: string) => Promise<void>;
  onMoveItemInCombination?: (
    combinationPublicId: string,
    itemPublicId: string,
    direction: "up" | "down"
  ) => Promise<void>;
  onRemoveItemFromCombination?: (
    combinationPublicId: string,
    itemPublicId: string
  ) => Promise<void>;
  onOpenConfigureSequence?: (
    item: WorkoutBlockItemDto,
    movements: DetectedMovement[]
  ) => void;
};

export function LegacyCombinationCard({
  combination,
  categoryPublicId,
  subBlockPublicId,
  allCategories,
  isDraft,
  expandedExerciseId,
  onToggleExpandExercise,
  onCloseExpandExercise,
  activeExerciseMenuId,
  onToggleExerciseMenu,
  onCloseExerciseMenu,
  movingExerciseId,
  onOpenMoveExercise,
  onCloseMoveExercise,
  onDuplicateExercise,
  onDeleteExercise,
  onMoveExerciseToCategory,
  onUpdateExerciseQuickConfig,
  onResolveExercise,
  onOpenCreateCustomExercise,
  onUpdateCombination,
  onUngroupCombination,
  onDeleteCombination,
  onDuplicateCombination,
  onMoveItemInCombination,
  onRemoveItemFromCombination,
  onOpenConfigureSequence,
}: LegacyCombinationCardProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(combination.title || "");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isEditingRest, setIsEditingRest] = useState(false);
  const [restDraft, setRestDraft] = useState(combination.restAfterSeconds ?? 60);
  const [isSeqModalOpen, setIsSeqModalOpen] = useState(false);
  const [, startTransition] = useTransition();

  const items = useMemo(() => combination.items || [], [combination.items]);
  const theme = getCombinationTheme(combination.combinationType);
  const badgeStyle = theme.badgeClass;
  const label = COMBINATION_TYPE_LABELS[combination.combinationType] || "Combinação";
  const combSeqExp = useMemo(() => buildSequenceMediaFromCombination(combination, items), [combination, items]);

  function handleSaveTitle() {
    if (!onUpdateCombination) {
      setIsEditingTitle(false);
      return;
    }
    startTransition(async () => {
      await onUpdateCombination(combination.publicId, { title: titleDraft.trim() || undefined });
      setIsEditingTitle(false);
    });
  }

  function handleSaveRest() {
    if (!onUpdateCombination) {
      setIsEditingRest(false);
      return;
    }
    startTransition(async () => {
      await onUpdateCombination(combination.publicId, { restAfterSeconds: restDraft });
      setIsEditingRest(false);
    });
  }

  return (
    <div className={`rounded-2xl border-2 ${theme.borderClass} ${theme.borderLeftClass} ${theme.cardBgClass} p-3 sm:p-4 space-y-3 shadow-xs transition-all`}>
      {/* Combination Header */}
      <div className={`flex items-center justify-between gap-2 pb-2.5 border-b ${theme.dividerClass || theme.borderClass}`}>
        <div className="flex items-center gap-2 min-w-0 flex-1 flex-wrap">
          {/* Badge */}
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-extrabold uppercase border ${badgeStyle} shadow-2xs shrink-0`}
          >
            <ZapIcon className="w-3 h-3" />
            <span>{label}</span>
          </span>

          {/* Title */}
          {isEditingTitle && isDraft ? (
            <div className="flex items-center gap-1.5 flex-1 max-w-xs">
              <input
                type="text"
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveTitle();
                  if (e.key === "Escape") setIsEditingTitle(false);
                }}
                autoFocus
                placeholder="Nome da combinação"
                className="w-full px-2.5 py-0.5 text-xs font-bold rounded-lg border border-emerald-500 bg-[var(--surface)] text-[var(--text-primary)] focus:outline-none"
              />
              <button
                type="button"
                onClick={handleSaveTitle}
                className="p-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 min-h-[26px] min-w-[26px] flex items-center justify-center shrink-0 cursor-pointer"
              >
                <Check className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <h4
              onClick={() => {
                if (isDraft) {
                  setTitleDraft(combination.title || "");
                  setIsEditingTitle(true);
                }
              }}
              className={`text-xs sm:text-sm font-bold text-[var(--text-primary)] truncate ${
                isDraft ? "cursor-pointer hover:text-emerald-600 transition-colors" : ""
              }`}
              title={isDraft ? "Clique para renomear combinação" : undefined}
            >
              {combination.title || `${label} (${items.length} exercícios)`}
            </h4>
          )}

          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[var(--surface)] border border-[var(--border-subtle)] text-[var(--text-secondary)] shrink-0">
            {items.length} {items.length === 1 ? "exercício" : "exercícios"}
          </span>
        </div>

        {/* Rest Badge & Menu */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Ver Sequência Button in Combination Header if media exists */}
          {combSeqExp?.hasPlayableMedia && (
            <button
              type="button"
              onClick={() => setIsSeqModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition-colors cursor-pointer min-h-[32px]"
              title="Ver sequência de execução guiada"
            >
              <VideoIcon className="w-3.5 h-3.5" />
              <span>Ver sequência</span>
            </button>
          )}

          {/* Rest Badge */}
          {isEditingRest && isDraft ? (
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={0}
                max={600}
                step={5}
                value={restDraft}
                onChange={(e) => setRestDraft(parseInt(e.target.value, 10) || 0)}
                className="w-14 px-1.5 py-0.5 text-xs font-bold text-center rounded-lg border border-emerald-500 bg-[var(--surface)] text-[var(--text-primary)]"
                autoFocus
              />
              <span className="text-xs text-[var(--text-secondary)] font-bold">s</span>
              <button
                type="button"
                onClick={handleSaveRest}
                className="p-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (isDraft) {
                  setRestDraft(combination.restAfterSeconds ?? 60);
                  setIsEditingRest(true);
                }
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer min-h-[44px] sm:min-h-[32px] ${
                isDraft
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20"
                  : "border-[var(--border-subtle)] bg-[var(--surface)] text-[var(--text-secondary)]"
              }`}
              title={isDraft ? "Clique para editar descanso pós-série" : undefined}
            >
              <ClockIcon className="w-3.5 h-3.5" />
              <span>{combination.restAfterSeconds}s pós-rodada</span>
            </button>
          )}

          {/* Menu [...] */}
          {isDraft && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                aria-label="Ações da combinação"
                className="p-2 sm:p-1 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)] transition-colors cursor-pointer min-h-[44px] min-w-[44px] sm:min-h-[32px] sm:min-w-[32px] flex items-center justify-center"
              >
                <MoreVertical className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
              </button>

              {isMenuOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setIsMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 w-52 rounded-2xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xl z-40 py-1.5 text-xs font-semibold text-[var(--text-primary)] divide-y divide-[var(--border-subtle)] animate-in fade-in zoom-in-95 duration-100">
                    <div className="p-1 space-y-0.5">
                      {onUngroupCombination && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsMenuOpen(false);
                            startTransition(() => onUngroupCombination(combination.publicId));
                          }}
                          className="w-full px-3 py-1.5 rounded-xl hover:bg-[var(--surface-subtle)] flex items-center gap-2 text-left text-emerald-700 dark:text-emerald-400 cursor-pointer"
                        >
                          <ZapIcon className="w-3.5 h-3.5" />
                          <span>Desfazer combinação</span>
                        </button>
                      )}

                      {onDuplicateCombination && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsMenuOpen(false);
                            startTransition(() => onDuplicateCombination(combination.publicId));
                          }}
                          className="w-full px-3 py-1.5 rounded-xl hover:bg-[var(--surface-subtle)] flex items-center gap-2 text-left cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5 text-blue-500" />
                          <span>Duplicar combinação</span>
                        </button>
                      )}
                    </div>

                    {/* Change Combination Type */}
                    {onUpdateCombination && (
                      <div className="p-1 space-y-0.5">
                        <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
                          Alterar Tipo
                        </div>
                        {(["BI_SET", "TRI_SET", "SUPERSET", "GIANT_SET", "CIRCUIT"] as WorkoutCombinationType[]).map(
                          (t) => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => {
                                setIsMenuOpen(false);
                                startTransition(() =>
                                  onUpdateCombination(combination.publicId, { combinationType: t })
                                );
                              }}
                              className={`w-full px-3 py-1 rounded-xl flex items-center justify-between text-left cursor-pointer ${
                                combination.combinationType === t
                                  ? "bg-emerald-500/10 text-emerald-600 font-bold"
                                  : "hover:bg-[var(--surface-subtle)] text-[var(--text-secondary)]"
                              }`}
                            >
                              <span>{COMBINATION_TYPE_LABELS[t]}</span>
                              {combination.combinationType === t && <Check className="w-3 h-3" />}
                            </button>
                          )
                        )}
                      </div>
                    )}

                    <div className="p-1">
                      {onDeleteCombination && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsMenuOpen(false);
                            if (
                              confirm(
                                `Excluir a combinação "${label}" e todos os seus ${items.length} exercício(s)?`
                              )
                            ) {
                              startTransition(() => onDeleteCombination(combination.publicId, true));
                            }
                          }}
                          className="w-full px-3 py-1.5 rounded-xl hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center gap-2 text-left cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Excluir combinação e itens</span>
                        </button>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Items inside Combination */}
      <div className="space-y-2">
        {items.map((item: WorkoutBlockItemDto, itemIdx: number) => {
          const isExpanded = expandedExerciseId === item.publicId;

          return (
            <div key={item.publicId}>
              <ExerciseRow
                item={item}
                itemIndex={itemIdx}
                totalItems={items.length}
                isExpanded={isExpanded}
                isDraft={isDraft}
                categoryPublicId={categoryPublicId}
                allCategories={allCategories}
                onToggleExpand={() => onToggleExpandExercise(item.publicId)}
                onCloseExpand={onCloseExpandExercise}
                isMenuOpen={activeExerciseMenuId === item.publicId}
                onToggleMenu={() => onToggleExerciseMenu(item.publicId)}
                onCloseMenu={onCloseExerciseMenu}
                isMovingOpen={movingExerciseId === item.publicId}
                onOpenMove={() => onOpenMoveExercise(item.publicId)}
                onCloseMove={onCloseMoveExercise}
                onDuplicate={() => onDuplicateExercise(item.publicId)}
                onDelete={() => onDeleteExercise(item.publicId)}
                onMoveUp={() => Promise.resolve()}
                onMoveDown={() => Promise.resolve()}
                onMoveToCategory={(targetCatId) => onMoveExerciseToCategory(item.publicId, targetCatId)}
                onSaveQuickConfig={(cfg) => onUpdateExerciseQuickConfig(item.publicId, cfg)}
                onResolve={() => onResolveExercise?.(item.publicId)}
                onOpenConvertCustom={() =>
                  onOpenCreateCustomExercise?.(categoryPublicId, subBlockPublicId || undefined, item.publicId, {
                    name: item.exerciseNameSnapshot,
                    muscleGroup: item.muscleGroupSnapshot || undefined,
                    equipment: item.equipmentSnapshot || undefined,
                  })
                }
                inCombination={true}
                combinationTheme={theme}
                isFirstInComb={itemIdx === 0}
                isLastInComb={itemIdx === items.length - 1}
                onOpenConfigureSequence={onOpenConfigureSequence}
                onMoveInCombination={(dir) =>
                  onMoveItemInCombination?.(combination.publicId, item.publicId, dir) || Promise.resolve()
                }
                onRemoveFromCombination={() =>
                  onRemoveItemFromCombination?.(combination.publicId, item.publicId) || Promise.resolve()
                }
              />

              {/* Direct Transition Connector between Items */}
              {itemIdx < items.length - 1 && (
                <div className="flex items-center justify-center my-1.5">
                  <div className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10px] font-bold border ${theme.connectorClass}`}>
                    <span>↓</span>
                    <span>Transição direta (sem descanso)</span>
                    <span>↓</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Combination Footer */}
      <div className="flex items-center justify-center pt-1 text-center">
        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-semibold ${theme.footerBgClass}`}>
          <ClockIcon className="w-3.5 h-3.5 text-current opacity-80" />
          <span>Descanso de {combination.restAfterSeconds}s após cada rodada completa</span>
        </div>
      </div>

      {/* Formal Combination Sequence Video Modal */}
      <SequenceExecutionModal
        isOpen={isSeqModalOpen}
        onClose={() => setIsSeqModalOpen(false)}
        experience={combSeqExp}
      />
    </div>
  );
}

// ============================================================================
// EXERCISE ROW COMPONENT
// ============================================================================

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
  onMoveStart?: () => Promise<void>;
  onMoveEnd?: () => Promise<void>;
  onMoveToPosition?: (targetPosition: number) => Promise<void>;
  onMoveToCategory: (targetCategoryPublicId: string) => Promise<void>;
  onSaveQuickConfig: (config: QuickConfigInput) => Promise<void>;
  onResolve?: () => void;
  onOpenConvertCustom?: () => void;
  onOpenConfigureSequence?: (
    item: WorkoutBlockItemDto,
    movements: DetectedMovement[]
  ) => void;
  // Selection mode for combinations
  isSelectionMode?: boolean;
  isSelected?: boolean;
  selectionIndex?: number;
  onToggleSelect?: () => void;
  onCombineFromHere?: () => void;
  onStartGuidedCombination?: (type: WorkoutCombinationType) => void;
  // Inside combination
  inCombination?: boolean;
  combinationTheme?: CombinationVisualTheme;
  executionIndex?: number;
  onMoveInCombination?: (direction: "up" | "down") => Promise<void>;
  onRemoveFromCombination?: () => Promise<void>;
  isFirstInComb?: boolean;
  isLastInComb?: boolean;
  consultancySlug?: string;
};

function ExerciseRow({
  item,
  itemIndex,
  totalItems,
  executionIndex,
  combinationTheme,
  isExpanded,
  isDraft,
  categoryPublicId,
  allCategories,
  consultancySlug,
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
  onMoveStart,
  onMoveEnd,
  onMoveToPosition,
  onMoveToCategory,
  onSaveQuickConfig,
  onResolve,
  onOpenConvertCustom,
  onOpenConfigureSequence,
  isSelectionMode,
  isSelected,
  selectionIndex,
  onToggleSelect,
  onCombineFromHere,
  onStartGuidedCombination,
  inCombination,
  onMoveInCombination,
  onRemoveFromCombination,
  isFirstInComb,
  isLastInComb,
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
  const [videoUrl, setVideoUrl] = useState<string | null>(item.customVideoUrl ?? null);
  const [saveToLibrary, setSaveToLibrary] = useState(false);
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
          effectiveUnit =
            parsedReps.durationSeconds >= 60 && parsedReps.durationSeconds % 60 === 0
              ? "MINUTES"
              : "SECONDS";
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
        customVideoUrl: videoUrl,
        saveToExerciseLibrary: saveToLibrary,
      });
      onCloseExpand();
    });
  }

  const repsOrDurationText = initialIsDuration
    ? formatDurationNatural(initialDuration, item.durationUnit)
    : formatRepetitionRange(initialReps, initialRepsMax);

  const summaryLine = `${initialSeriesCount} ${initialSeriesCount === 1 ? "série" : "séries"} • ${repsOrDurationText} • ${
    inCombination ? "transição direta" : `${initialRest}s`
  }${initialLoad != null ? ` • ${initialLoad} kg` : ""}`;

  const isCustom = Boolean(item.isCustomExercise || item.customExercisePublicId);
  const isSequence = Boolean(item.methodConfig?.isSequence || item.methodConfig?.customSequence);
  const isUnmatched = !item.exercisePublicId && !isCustom;
  const hasVideo = Boolean((item.customVideoUrl && item.customVideoUrl.trim().length > 0) || (item.pinnedMedia && item.pinnedMedia.length > 0));

  const sequenceExp = useMemo(() => isSequence ? buildSequenceMediaFromCustomItem(item) : null, [isSequence, item]);
  const [isSequenceExecutionOpen, setIsSequenceExecutionOpen] = useState(false);
  const detectedSeq = useMemo(() => isSequence ? null : detectExerciseSequenceFromText(item.exerciseNameSnapshot), [isSequence, item.exerciseNameSnapshot]);

  return (
    <div
      role={isSelectionMode && !inCombination ? "checkbox" : undefined}
      aria-checked={isSelectionMode && !inCombination ? isSelected : undefined}
      tabIndex={isSelectionMode && !inCombination ? 0 : undefined}
      onClick={() => {
        if (isSelectionMode && !inCombination) {
          onToggleSelect?.();
        }
      }}
      onKeyDown={(e) => {
        if (isSelectionMode && !inCombination && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onToggleSelect?.();
        }
      }}
      className={`rounded-xl border transition-all w-full max-w-full min-w-0 ${
        inCombination && combinationTheme
          ? combinationTheme.memberRowClass
          : isSelectionMode && !inCombination
          ? isSelected
            ? "border-2 border-emerald-500 bg-emerald-500/10 dark:bg-emerald-950/30 shadow-md ring-2 ring-emerald-500/30 scale-[1.008] cursor-pointer"
            : "border-dashed border-emerald-500/50 bg-[var(--surface)] hover:border-emerald-500 hover:bg-emerald-500/5 cursor-pointer"
          : isUnmatched
          ? "border-amber-500/40 bg-amber-500/5 hover:border-amber-500/60"
          : isCustom
          ? "border-[var(--border-subtle)] dark:border-white/[0.08] bg-[var(--surface)] dark:bg-zinc-900/60 hover:border-white/20"
          : isExpanded
          ? "border-emerald-500 bg-[var(--surface)] dark:bg-zinc-900/90 shadow-md ring-2 ring-emerald-500/20"
          : "border border-zinc-200/90 dark:border-zinc-800 border-t-white/80 dark:border-t-white/10 border-b-zinc-300/80 dark:border-b-black/70 bg-zinc-50/90 dark:bg-zinc-900/90 shadow-[0_2px_4px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)] dark:shadow-[0_4px_8px_rgba(0,0,0,0.3)] hover:border-emerald-500/30"
      }`}
    >
      {/* Compact Header Row */}
      <div
        onClick={(e) => {
          if (isSelectionMode && !inCombination) {
            e.stopPropagation();
            onToggleSelect?.();
          } else if (isDraft) {
            onToggleExpand();
          }
        }}
        className={`p-2.5 sm:p-3 flex items-start sm:items-center justify-between gap-2.5 w-full max-w-full min-w-0 ${
          isDraft || isSelectionMode ? "cursor-pointer" : ""
        }`}
      >
        {/* Selection Checkbox for Combination Mode */}
        {isSelectionMode && !inCombination && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect?.();
            }}
            className="min-h-[44px] min-w-[44px] -ml-1 sm:ml-0 flex items-center justify-center shrink-0 cursor-pointer"
            aria-label={isSelected ? "Exercício selecionado" : "Selecionar exercício"}
          >
            <div
              className={`w-7 h-7 sm:w-6 sm:h-6 rounded-xl flex items-center justify-center border-2 transition-all font-black text-xs ${
                isSelected
                  ? "bg-emerald-600 border-emerald-600 text-white shadow-xs scale-105"
                  : "border-emerald-500/60 bg-[var(--surface)] hover:border-emerald-600 text-[var(--text-tertiary)]"
              }`}
            >
              {isSelected ? (
                <span>{selectionIndex ?? 1}</span>
              ) : (
                <span className="w-2 h-2 rounded-full bg-emerald-500/30" />
              )}
            </div>
          </div>
        )}

        <div className="min-w-0 flex-1 space-y-1">
          {/* Line 1: Exercise Name & Status Badges */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 min-w-0 flex-wrap">
              {executionIndex != null && (
                <span className="text-[11px] font-black px-2 py-0.5 rounded-lg bg-[var(--surface-subtle)] text-[var(--text-secondary)] border border-[var(--border-subtle)] shrink-0">
                  #{executionIndex}
                </span>
              )}
              <h3 className="text-xs sm:text-sm font-bold text-[var(--text-primary)] line-clamp-2 sm:truncate break-words">
                {item.exerciseNameSnapshot}
              </h3>

              {isSelectionMode && !inCombination && isSelected && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-extrabold bg-emerald-600 text-white shadow-xs shrink-0">
                  <span>✓ Selecionado</span>
                  <span>(#{selectionIndex ?? 1})</span>
                </span>
              )}

              {isCustom && (
                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium whitespace-nowrap shrink-0 border ${
                  isSequence
                    ? "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20"
                    : "bg-[var(--surface-subtle)] text-[var(--text-secondary)] border border-[var(--border-subtle)]"
                }`}>
                  {isSequence ? "Sequência personalizada" : "Personalizado"}
                </span>
              )}

              {isUnmatched && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 whitespace-nowrap shrink-0">
                  ⚠ Precisa revisar
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {isUnmatched && isDraft && (
                <>
                  {onResolve && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onResolve();
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] sm:text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-xs shrink-0 cursor-pointer"
                      title="Vincular a um exercício da biblioteca"
                    >
                      <span className="hidden sm:inline">Resolver na biblioteca</span>
                      <span className="sm:hidden">Resolver</span>
                    </button>
                  )}
                  {onOpenConvertCustom && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenConvertCustom();
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] sm:text-[11px] font-bold text-violet-700 dark:text-violet-300 bg-violet-500/15 hover:bg-violet-500/25 border border-violet-500/30 transition-colors shrink-0 cursor-pointer"
                      title="Salvar como exercício ou sequência personalizada fora da biblioteca"
                    >
                      <span>✨</span>
                      <span className="hidden sm:inline">Usar como personalizado</span>
                      <span className="sm:hidden">Personalizar</span>
                    </button>
                  )}
                </>
              )}
              {sequenceExp?.hasPlayableMedia ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsSequenceExecutionOpen(true);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs transition-colors shrink-0 cursor-pointer"
                  title={`Ver sequência de ${item.exerciseNameSnapshot}`}
                >
                  <VideoIcon className="w-3.5 h-3.5" />
                  <span>Ver sequência</span>
                </button>
              ) : hasVideo ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsExecutionModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors shrink-0 cursor-pointer"
                  title={`Ver execução de ${item.exerciseNameSnapshot}`}
                >
                  <span>Ver execução →</span>
                </button>
              ) : null}
            </div>
          </div>

          {/* Sequence movements list */}
          {isSequence && Array.isArray((item.methodConfig?.customSequence as { movements?: unknown[] })?.movements) && (((item.methodConfig?.customSequence as { movements?: unknown[] })?.movements?.length ?? 0) > 0) && (
            <div className="text-[11px] text-[var(--text-secondary)] font-medium bg-[var(--surface-subtle)]/70 px-2.5 py-1 rounded-lg border border-[var(--border-subtle)] w-fit max-w-full">
              <span className="font-semibold text-purple-700 dark:text-purple-300 mr-1.5">Movimentos:</span>
              <span>
                {((item.methodConfig?.customSequence as { movements: unknown[] }).movements).map((m: unknown, idx: number) => {
                  const label = typeof m === "string" ? m : (m as { label?: string })?.label || `Movimento ${idx + 1}`;
                  const hint = typeof m === "object" && m !== null
                    ? ((m as { repsText?: string })?.repsText || (m as { durationText?: string })?.durationText)
                    : null;
                  return hint ? `${label} (${hint})` : label;
                }).join(" • ")}
              </span>
            </div>
          )}

          {/* Discreet prompt when sequence is detected in text but not yet structured */}
          {isDraft && !isSequence && detectedSeq?.detected && detectedSeq.movements.length >= 2 && onOpenConfigureSequence && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-700 dark:text-purple-300 text-[11px] font-semibold w-fit">
              <span>✨ Sequência detectada ({detectedSeq.movements.length} movimentos)</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenConfigureSequence(item, detectedSeq.movements);
                }}
                className="underline hover:text-purple-900 dark:hover:text-purple-100 cursor-pointer ml-1 font-bold"
              >
                Configurar sequência
              </button>
            </div>
          )}

          {/* Method / Observation: Subtle inline styling */}
          {item.notes && item.notes.trim() && (
            <div className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700/90 dark:text-amber-400/90 w-fit">
              <span>⚡ {item.notes.trim()}</span>
            </div>
          )}

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
        </div>

        {/* Action Controls */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1 shrink-0 relative"
        >
          {isDraft && (
            <>
              {inCombination ? (
                <>
                  <button
                    type="button"
                    disabled={isFirstInComb || isPending}
                    onClick={() => startTransition(() => onMoveInCombination?.("up") || Promise.resolve())}
                    aria-label="Mover para cima na combinação"
                    className="p-2 sm:p-1 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] disabled:opacity-30 disabled:pointer-events-none transition-colors min-h-[44px] min-w-[44px] sm:min-h-[28px] sm:min-w-[28px] sm:w-7 sm:h-7 flex items-center justify-center cursor-pointer"
                    title="Mover para cima na combinação"
                  >
                    <ArrowUp className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={isLastInComb || isPending}
                    onClick={() => startTransition(() => onMoveInCombination?.("down") || Promise.resolve())}
                    aria-label="Mover para baixo na combinação"
                    className="p-2 sm:p-1 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] disabled:opacity-30 disabled:pointer-events-none transition-colors min-h-[44px] min-w-[44px] sm:min-h-[28px] sm:min-w-[28px] sm:w-7 sm:h-7 flex items-center justify-center cursor-pointer"
                    title="Mover para baixo na combinação"
                  >
                    <ArrowDown className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                  </button>
                </>
              ) : (
                <div className="flex items-center sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    disabled={itemIndex === 0 || isPending}
                    onClick={() => startTransition(() => onMoveUp())}
                    aria-label="Mover exercício para cima"
                    className="p-2 sm:p-1 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] disabled:opacity-30 disabled:pointer-events-none transition-colors min-h-[44px] min-w-[44px] sm:min-h-[28px] sm:min-w-[28px] sm:w-7 sm:h-7 flex items-center justify-center cursor-pointer"
                    title="Mover para cima"
                  >
                    <ArrowUp className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={itemIndex === totalItems - 1 || isPending}
                    onClick={() => startTransition(() => onMoveDown())}
                    aria-label="Mover exercício para baixo"
                    className="p-2 sm:p-1 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] disabled:opacity-30 disabled:pointer-events-none transition-colors min-h-[44px] min-w-[44px] sm:min-h-[28px] sm:min-w-[28px] sm:w-7 sm:h-7 flex items-center justify-center cursor-pointer"
                    title="Mover para baixo"
                  >
                    <ArrowDown className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                  </button>
                </div>
              )}

              {!inCombination && onCombineFromHere && !isSelectionMode && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCombineFromHere();
                  }}
                  aria-label="Combinar exercício"
                  title="Combinar em Bi-Set (1 clique)"
                  className="p-2 sm:p-1 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 transition-colors min-h-[44px] min-w-[44px] sm:min-h-[28px] sm:min-w-[28px] sm:w-7 sm:h-7 flex items-center justify-center cursor-pointer"
                >
                  <Link2Icon className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                </button>
              )}

              <div className="relative">
                <button
                  type="button"
                  onClick={onToggleMenu}
                  aria-label="Opções do exercício"
                  className="p-2 sm:p-1 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] transition-colors min-h-[44px] min-w-[44px] sm:min-h-[28px] sm:min-w-[28px] sm:w-7 sm:h-7 flex items-center justify-center cursor-pointer"
                >
                  <MoreVertical className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                </button>

                {isMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={onCloseMenu} />
                    <div className="absolute right-0 top-full mt-1 w-52 rounded-2xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xl z-40 py-1.5 text-xs font-semibold text-[var(--text-primary)] divide-y divide-[var(--border-subtle)] animate-in fade-in zoom-in-95 duration-100">
                      <div className="p-1 space-y-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            onCloseMenu();
                            onToggleExpand();
                          }}
                          className="w-full px-3 py-2 sm:py-1.5 rounded-xl hover:bg-[var(--surface-subtle)] flex items-center gap-2 text-left cursor-pointer min-h-[40px] sm:min-h-[34px]"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-emerald-500" />
                          <span>{isExpanded ? "Fechar edição" : "Editar prescrição"}</span>
                        </button>

                        {/* Accessible Move Without Drag */}
                        {!inCombination ? (
                          <>
                            <button
                              type="button"
                              disabled={itemIndex === 0 || isPending}
                              onClick={() => {
                                onCloseMenu();
                                startTransition(() => onMoveUp());
                              }}
                              className="w-full px-3 py-2 sm:py-1.5 rounded-xl hover:bg-[var(--surface-subtle)] flex items-center gap-2 text-left disabled:opacity-35 cursor-pointer min-h-[40px] sm:min-h-[34px]"
                            >
                              <ArrowUp className="w-3.5 h-3.5 text-emerald-500" />
                              <span>Mover para cima</span>
                            </button>
                            <button
                              type="button"
                              disabled={itemIndex === totalItems - 1 || isPending}
                              onClick={() => {
                                onCloseMenu();
                                startTransition(() => onMoveDown());
                              }}
                              className="w-full px-3 py-2 sm:py-1.5 rounded-xl hover:bg-[var(--surface-subtle)] flex items-center gap-2 text-left disabled:opacity-35 cursor-pointer min-h-[40px] sm:min-h-[34px]"
                            >
                              <ArrowDown className="w-3.5 h-3.5 text-emerald-500" />
                              <span>Mover para baixo</span>
                            </button>
                            {onMoveStart && (
                              <button
                                type="button"
                                disabled={itemIndex === 0 || isPending}
                                onClick={() => {
                                  onCloseMenu();
                                  startTransition(() => onMoveStart?.() || Promise.resolve());
                                }}
                                className="w-full px-3 py-2 sm:py-1.5 rounded-xl hover:bg-[var(--surface-subtle)] flex items-center gap-2 text-left disabled:opacity-35 cursor-pointer min-h-[40px] sm:min-h-[34px]"
                              >
                                <ArrowUp className="w-3.5 h-3.5 text-emerald-500" />
                                <span>Mover para o início</span>
                              </button>
                            )}
                            {onMoveEnd && (
                              <button
                                type="button"
                                disabled={itemIndex === totalItems - 1 || isPending}
                                onClick={() => {
                                  onCloseMenu();
                                  startTransition(() => onMoveEnd?.() || Promise.resolve());
                                }}
                                className="w-full px-3 py-2 sm:py-1.5 rounded-xl hover:bg-[var(--surface-subtle)] flex items-center gap-2 text-left disabled:opacity-35 cursor-pointer min-h-[40px] sm:min-h-[34px]"
                              >
                                <ArrowDown className="w-3.5 h-3.5 text-emerald-500" />
                                <span>Mover para o final</span>
                              </button>
                            )}
                            {onMoveToPosition && totalItems > 1 && (
                              <div className="px-3 py-1.5 flex items-center justify-between gap-2">
                                <span className="text-[11px] text-[var(--text-secondary)] font-medium">Posição:</span>
                                <select
                                  value={itemIndex + 1}
                                  onChange={(e) => {
                                    onCloseMenu();
                                    const targetPos = Number(e.target.value) - 1;
                                    startTransition(() => onMoveToPosition?.(targetPos) || Promise.resolve());
                                  }}
                                  className="px-2 py-1 rounded-lg bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-xs font-bold text-[var(--text-primary)] cursor-pointer"
                                >
                                  {Array.from({ length: totalItems }, (_, i) => (
                                    <option key={i + 1} value={i + 1}>
                                      {i + 1}º de {totalItems}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              disabled={isFirstInComb || isPending}
                              onClick={() => {
                                onCloseMenu();
                                startTransition(() => onMoveInCombination?.("up") || Promise.resolve());
                              }}
                              className="w-full px-3 py-2 sm:py-1.5 rounded-xl hover:bg-[var(--surface-subtle)] flex items-center gap-2 text-left disabled:opacity-35 cursor-pointer min-h-[40px] sm:min-h-[34px]"
                            >
                              <ArrowUp className="w-3.5 h-3.5 text-emerald-500" />
                              <span>Mover para cima no grupo</span>
                            </button>
                            <button
                              type="button"
                              disabled={isLastInComb || isPending}
                              onClick={() => {
                                onCloseMenu();
                                startTransition(() => onMoveInCombination?.("down") || Promise.resolve());
                              }}
                              className="w-full px-3 py-2 sm:py-1.5 rounded-xl hover:bg-[var(--surface-subtle)] flex items-center gap-2 text-left disabled:opacity-35 cursor-pointer min-h-[40px] sm:min-h-[34px]"
                            >
                              <ArrowDown className="w-3.5 h-3.5 text-emerald-500" />
                              <span>Mover para baixo no grupo</span>
                            </button>
                          </>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            onCloseMenu();
                            startTransition(() => onDuplicate());
                          }}
                          className="w-full px-3 py-2 sm:py-1.5 rounded-xl hover:bg-[var(--surface-subtle)] flex items-center gap-2 text-left cursor-pointer min-h-[40px] sm:min-h-[34px]"
                        >
                          <Copy className="w-3.5 h-3.5 text-blue-500" />
                          <span>Duplicar exercício</span>
                        </button>

                        {!inCombination && onStartGuidedCombination && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                onCloseMenu();
                                onStartGuidedCombination("BI_SET");
                              }}
                              className="w-full px-3 py-2 sm:py-1.5 rounded-xl hover:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center gap-2 text-left font-semibold text-xs cursor-pointer min-h-[40px] sm:min-h-[34px]"
                            >
                              <ZapIcon className="w-3.5 h-3.5 text-blue-500" />
                              <span>Criar bi-set com este exercício</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                onCloseMenu();
                                onStartGuidedCombination("TRI_SET");
                              }}
                              className="w-full px-3 py-2 sm:py-1.5 rounded-xl hover:bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center gap-2 text-left font-semibold text-xs cursor-pointer min-h-[40px] sm:min-h-[34px]"
                            >
                              <ZapIcon className="w-3.5 h-3.5 text-purple-500" />
                              <span>Criar tri-set com este exercício</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                onCloseMenu();
                                onStartGuidedCombination("CIRCUIT");
                              }}
                              className="w-full px-3 py-2 sm:py-1.5 rounded-xl hover:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center gap-2 text-left font-semibold text-xs cursor-pointer min-h-[40px] sm:min-h-[34px]"
                            >
                              <ZapIcon className="w-3.5 h-3.5 text-amber-500" />
                              <span>Criar circuito com este exercício</span>
                            </button>
                          </>
                        )}

                        {!inCombination && onCombineFromHere && (
                          <button
                            type="button"
                            onClick={() => {
                              onCloseMenu();
                              onCombineFromHere();
                            }}
                            className="w-full px-3 py-2 sm:py-1.5 rounded-xl hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center gap-2 text-left font-semibold text-xs cursor-pointer min-h-[40px] sm:min-h-[34px]"
                          >
                            <ZapIcon className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Combinar a partir daqui</span>
                          </button>
                        )}

                        {!inCombination && (
                          <button
                            type="button"
                            onClick={() => {
                              onCloseMenu();
                              onOpenMove();
                            }}
                            className="w-full px-3 py-2 sm:py-1.5 rounded-xl hover:bg-[var(--surface-subtle)] flex items-center gap-2 text-left cursor-pointer min-h-[40px] sm:min-h-[34px]"
                          >
                            <MoveIcon className="w-3.5 h-3.5 text-amber-500" />
                            <span>Mover treino</span>
                          </button>
                        )}

                        {inCombination && onRemoveFromCombination && (
                          <button
                            type="button"
                            onClick={() => {
                              onCloseMenu();
                              startTransition(() => onRemoveFromCombination());
                            }}
                            className="w-full px-3 py-2 sm:py-1.5 rounded-xl hover:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center gap-2 text-left cursor-pointer min-h-[40px] sm:min-h-[34px]"
                          >
                            <ZapIcon className="w-3.5 h-3.5" />
                            <span>Tirar da combinação</span>
                          </button>
                        )}
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
                          className="w-full px-3 py-2 sm:py-1.5 rounded-xl hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center gap-2 text-left cursor-pointer min-h-[40px] sm:min-h-[34px]"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remover exercício</span>
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
                Método / Observação <span className="font-normal text-[10px] text-[var(--text-tertiary)]">(opcional)</span>
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Execução em dois tempos, Rest pause, Isometria final..."
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface)] text-[var(--text-primary)] focus:ring-2 focus:ring-emerald-500 focus:outline-none min-h-[40px]"
              />
            </div>
          </div>

          {/* Vídeo de Execução */}
          <ExerciseVideoEditorSection
            currentVideoUrl={videoUrl}
            fallbackMedia={item.pinnedMedia}
            isCustomExercise={isCustom}
            canSaveToLibrary={Boolean(!isCustom && item.exercisePublicId)}
            consultancySlug={consultancySlug}
            exercisePublicId={item.exercisePublicId}
            exerciseName={item.exerciseNameSnapshot}
            onVideoChange={(newUrl, toLibrary) => {
              setVideoUrl(newUrl);
              if (toLibrary !== undefined) setSaveToLibrary(toLibrary);
            }}
            disabled={isPending}
          />

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

      {/* Sequence Execution Modal */}
      <SequenceExecutionModal
        isOpen={isSequenceExecutionOpen}
        onClose={() => setIsSequenceExecutionOpen(false)}
        experience={sequenceExp}
      />
    </div>
  );
}

// ============================================================================
// MOBILE-NATIVE COMPONENTS (TOUCH-FIRST / THUMB ZONE / ZERO DRAG)
// ============================================================================

function getItemPrescriptionSummary(item: WorkoutBlockItemDto) {
  const sets = item.sets || [];
  const seriesCount = sets.length > 0 ? sets.length : 3;
  const firstSet = sets[0];
  const duration = firstSet?.targetDurationSeconds ?? null;
  const isDuration = duration != null && duration > 0 && (!firstSet?.targetReps || firstSet?.targetReps === 0);
  const reps = firstSet?.targetReps ?? 10;
  const repsMax = firstSet?.targetRepsMax ?? null;
  const repsText = isDuration
    ? formatDurationNatural(duration, item.durationUnit || firstSet?.durationUnit)
    : formatRepetitionRange(reps, repsMax);
  const loadKg = firstSet?.targetLoadKg ?? null;
  const restSeconds = firstSet?.targetRestSeconds ?? 60;
  const repsDraft = reps != null
    ? repsMax != null
      ? `${reps}-${repsMax}`
      : `${reps}`
    : "10";

  return {
    seriesCount,
    isDuration,
    reps,
    repsMax,
    repsText,
    repsDraft,
    loadKg,
    restSeconds,
  };
}

export type UnifiedCombinationBlockProps = {
  combination: WorkoutItemCombinationDto;
  categoryPublicId: string;
  subBlockPublicId?: string | null;
  entryIndex?: number;
  totalEntries?: number;
  executionIndex?: number;
  allCategories?: { publicId: string; title: string }[];
  isDraft: boolean;
  onMoveEntryUp?: () => void;
  onMoveEntryDown?: () => void;
  onMoveEntryStart?: () => void;
  onMoveEntryEnd?: () => void;
  onMoveEntryToPosition?: (position: number) => void;
  onOpenEditCombination: (combination: WorkoutItemCombinationDto) => void;
  onOpenQuickEdit: (item: WorkoutBlockItemDto) => void;
  onOpenActions: (item: WorkoutBlockItemDto, index: number, total: number, combinationPublicId?: string) => void;
  onOpenExecutionModal?: (item: WorkoutBlockItemDto) => void;
  onMoveItemInCombination?: (
    combinationPublicId: string,
    itemPublicId: string,
    direction: "up" | "down"
  ) => Promise<void>;
  onRemoveItemFromCombination?: (
    combinationPublicId: string,
    itemPublicId: string
  ) => Promise<void>;
  onUngroupCombination?: (combinationPublicId: string) => Promise<void>;
  onDeleteCombination?: (combinationPublicId: string, deleteItems?: boolean) => Promise<void>;
};

export function UnifiedCombinationBlock({
  combination,
  entryIndex = 0,
  totalEntries = 1,
  executionIndex,
  isDraft,
  onMoveEntryUp,
  onMoveEntryDown,
  onMoveEntryStart,
  onMoveEntryEnd,
  onMoveEntryToPosition,
  onOpenEditCombination,
  onOpenQuickEdit,
  onOpenActions,
  onMoveItemInCombination,
  onUngroupCombination,
  onDeleteCombination,
}: UnifiedCombinationBlockProps) {
  const items = useMemo(() => combination.items || [], [combination.items]);
  const theme = getCombinationTheme(combination.combinationType);
  const typeLabel = COMBINATION_TYPE_LABELS[combination.combinationType] || combination.combinationType;
  const activeRest = parseActiveRest(combination.title);
  const restSec = combination.restAfterSeconds ?? 60;
  const [, startTransition] = useTransition();
  const [isCombMenuOpen, setIsCombMenuOpen] = useState(false);
  const [isSeqModalOpen, setIsSeqModalOpen] = useState(false);
  const [isReordering, setIsReordering] = useState(false);
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dragOverItemId, setDragOverItemId] = useState<string | null>(null);
  const combSeqExp = useMemo(() => buildSequenceMediaFromCombination(combination, items), [combination, items]);

  const LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H"];

  return (
    <div
      data-testid="mobile-combination-block"
      data-block-type="unified-combination-block"
      className={`rounded-2xl border-2 ${theme.borderClass} ${theme.borderLeftClass} ${theme.cardBgClass} shadow-sm dark:shadow-md hover:shadow-md transition-all w-full max-w-full min-w-0 overflow-hidden`}
    >
      {/* Mobile Block Header (<sm) — dedicated compact ergonomic layout */}
      <div className={`sm:hidden px-4 py-3 ${theme.headerBgClass} border-b ${theme.dividerClass} w-full max-w-full min-w-0`}>
        <div className="flex items-center justify-between gap-2 w-full">
          {/* Header Title: BI-SET · #N · 3 voltas */}
          <div className="flex items-center gap-2 min-w-0 flex-1 flex-wrap">
            <span className={`text-[10px] sm:text-xs font-black uppercase tracking-wider ${theme.badgeClass} px-2 py-0.5 rounded-md shrink-0`}>
              {typeLabel}
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-black/10 dark:bg-white/10 text-current border border-current/20 shrink-0">
              #{executionIndex ?? (entryIndex + 1)}
            </span>
            <span className="text-xs font-bold text-[var(--text-tertiary)]">·</span>
            <span className="text-xs font-bold text-[var(--text-secondary)] whitespace-nowrap">
              {items[0]?.sets?.length || 3} voltas
            </span>
          </div>

          {/* Header Actions: Discreet Ver sequência & More */}
          <div className="flex items-center gap-1.5 shrink-0">
            {combSeqExp?.hasPlayableMedia && (
              <button
                type="button"
                onClick={() => setIsSeqModalOpen(true)}
                aria-label="Ver sequência de execução guiada"
                data-testid="combination-view-sequence-btn"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-zinc-700 dark:text-zinc-200 bg-zinc-100 hover:bg-zinc-200 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] border border-zinc-200 dark:border-white/[0.1] transition-all cursor-pointer min-h-[36px]"
                title="Ver sequência de execução guiada"
              >
                <VideoIcon className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span className="truncate">Ver sequência</span>
              </button>
            )}

            {isDraft && (
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setIsCombMenuOpen((v) => !v)}
                  aria-label="Opções da combinação"
                  className="w-11 h-11 min-h-[44px] min-w-[44px] rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border-subtle)] text-[var(--text-secondary)] flex items-center justify-center transition-colors cursor-pointer"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>

                {isCombMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setIsCombMenuOpen(false)} />
                    <div className="absolute right-0 top-full mt-1.5 w-52 rounded-xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xl z-40 py-1.5 text-xs font-semibold text-[var(--text-primary)] divide-y divide-[var(--border-subtle)] animate-in fade-in zoom-in-95 duration-100">
                      {(onMoveEntryUp || onMoveEntryDown) && (
                        <div className="p-1 space-y-0.5">
                          {onMoveEntryUp && (
                            <button
                              type="button"
                              disabled={entryIndex === 0}
                              onClick={() => {
                                setIsCombMenuOpen(false);
                                onMoveEntryUp();
                              }}
                              className="w-full px-3 py-2.5 rounded-lg hover:bg-[var(--surface-subtle)] disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2 text-left cursor-pointer min-h-[44px]"
                            >
                              <ArrowUp className="w-4 h-4" />
                              <span>Mover para cima</span>
                            </button>
                          )}
                          {onMoveEntryDown && (
                            <button
                              type="button"
                              disabled={entryIndex >= totalEntries - 1}
                              onClick={() => {
                                setIsCombMenuOpen(false);
                                onMoveEntryDown();
                              }}
                              className="w-full px-3 py-2.5 rounded-lg hover:bg-[var(--surface-subtle)] disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2 text-left cursor-pointer min-h-[44px]"
                            >
                              <ArrowDown className="w-4 h-4" />
                              <span>Mover para baixo</span>
                            </button>
                          )}
                          {onMoveEntryStart && (
                            <button
                              type="button"
                              disabled={entryIndex === 0}
                              onClick={() => {
                                setIsCombMenuOpen(false);
                                onMoveEntryStart();
                              }}
                              className="w-full px-3 py-2.5 rounded-lg hover:bg-[var(--surface-subtle)] disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2 text-left cursor-pointer min-h-[44px]"
                            >
                              <ArrowUp className="w-4 h-4 text-emerald-500" />
                              <span>Mover para o início</span>
                            </button>
                          )}
                          {onMoveEntryEnd && (
                            <button
                              type="button"
                              disabled={entryIndex >= totalEntries - 1}
                              onClick={() => {
                                setIsCombMenuOpen(false);
                                onMoveEntryEnd();
                              }}
                              className="w-full px-3 py-2.5 rounded-lg hover:bg-[var(--surface-subtle)] disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2 text-left cursor-pointer min-h-[44px]"
                            >
                              <ArrowDown className="w-4 h-4 text-emerald-500" />
                              <span>Mover para o final</span>
                            </button>
                          )}
                          {onMoveEntryToPosition && totalEntries > 1 && (
                            <div className="px-3 py-2 flex items-center justify-between gap-2">
                              <span className="text-[11px] text-[var(--text-secondary)] font-medium">Posição:</span>
                              <select
                                value={entryIndex + 1}
                                onChange={(e) => {
                                  setIsCombMenuOpen(false);
                                  const targetPos = Number(e.target.value) - 1;
                                  onMoveEntryToPosition(targetPos);
                                }}
                                className="px-2 py-1 rounded-lg bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-xs font-bold text-[var(--text-primary)] cursor-pointer"
                              >
                                {Array.from({ length: totalEntries }, (_, i) => (
                                  <option key={i + 1} value={i + 1}>
                                    {i + 1}º de {totalEntries}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="p-1 space-y-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            setIsCombMenuOpen(false);
                            onOpenEditCombination(combination);
                          }}
                          className="w-full px-3 py-2.5 rounded-lg hover:bg-[var(--surface-subtle)] flex items-center gap-2 text-left cursor-pointer min-h-[44px]"
                        >
                          <ZapIcon className="w-4 h-4 text-emerald-600" />
                          <span>Editar combinação</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setIsCombMenuOpen(false);
                            setIsReordering((prev) => !prev);
                          }}
                          className="w-full px-3 py-2.5 rounded-lg hover:bg-[var(--surface-subtle)] flex items-center gap-2 text-left cursor-pointer min-h-[44px]"
                        >
                          <MoveIcon className="w-4 h-4 text-amber-500" />
                          <span>{isReordering ? "Concluir reordenação" : "Reordenar exercícios"}</span>
                        </button>
                      </div>

                      {onUngroupCombination && (
                        <div className="p-1">
                          <button
                            type="button"
                            onClick={() => {
                              setIsCombMenuOpen(false);
                              if (confirm(`Desfazer este ${typeLabel} e manter os exercícios separados?`)) {
                                startTransition(() => onUngroupCombination(combination.publicId));
                              }
                            }}
                            className="w-full px-3 py-2.5 rounded-lg hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center gap-2 text-left cursor-pointer min-h-[44px]"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>Desfazer combinação</span>
                          </button>
                        </div>
                      )}

                      {onDeleteCombination && (
                        <div className="p-1">
                          <button
                            type="button"
                            onClick={() => {
                              setIsCombMenuOpen(false);
                              if (confirm(`Excluir esta combinação ${typeLabel}?`)) {
                                startTransition(() => onDeleteCombination(combination.publicId, true));
                              }
                            }}
                            className="w-full px-3 py-2.5 rounded-lg hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center gap-2 text-left cursor-pointer min-h-[44px]"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>Excluir combinação</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Desktop Header (>=sm) — preserved horizontal flow */}
      <div className={`hidden sm:flex px-4 py-2.5 ${theme.headerBgClass} border-b ${theme.dividerClass} items-center justify-between gap-2 flex-wrap w-full max-w-full min-w-0`}>
        <div className="flex items-center gap-2 min-w-0 flex-1 flex-wrap">
          <span className={`text-xs font-black uppercase tracking-wider ${theme.badgeClass} shrink-0 px-2 py-0.5 rounded-md`}>
            {typeLabel}
          </span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-black/10 dark:bg-white/10 text-current border border-current/20 shrink-0">
            #{executionIndex ?? (entryIndex + 1)} na execução
          </span>
          <span className="text-xs font-bold text-[var(--text-tertiary)]">·</span>
          <span className="text-xs font-bold text-[var(--text-secondary)] whitespace-nowrap">
            {items[0]?.sets?.length || 3} rodadas
          </span>
          <span className="text-xs font-bold text-[var(--text-tertiary)]">·</span>
          <span className="text-xs font-semibold text-[var(--text-secondary)] whitespace-nowrap">
            {activeRest.isActive ? `🏃 Ativo · ${restSec}s (${activeRest.activity})` : `${restSec}s descanso`}
          </span>
          {combination.title && !activeRest.isActive && (
            <span className="text-xs font-medium text-[var(--text-tertiary)] truncate max-w-xs" title={combination.title}>
              · {combination.title.replace(/•?\s*Descanso Ativo:.*$/i, "").trim()}
            </span>
          )}

          {/* Ver Sequência Button in Desktop Combination Header */}
          {combSeqExp?.hasPlayableMedia && (
            <button
              type="button"
              onClick={() => setIsSeqModalOpen(true)}
              data-testid="combination-view-sequence-btn"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold text-zinc-700 dark:text-zinc-200 bg-zinc-100 hover:bg-zinc-200 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] border border-zinc-200 dark:border-white/[0.1] transition-colors cursor-pointer min-h-[32px]"
              title="Ver sequência de execução guiada"
            >
              <VideoIcon className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span>Ver sequência</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0 relative">
          {/* Block-level Move Controls (↑ / ↓) */}
          {isDraft && onMoveEntryUp && onMoveEntryDown && (
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                disabled={entryIndex === 0}
                onClick={onMoveEntryUp}
                aria-label="Mover bloco para cima"
                title="Mover bloco para cima"
                className="w-7 h-7 rounded-lg bg-[var(--surface)] hover:bg-[var(--surface-hover)] dark:bg-white/[0.04] dark:hover:bg-white/[0.08] border border-[var(--border-subtle)] dark:border-white/[0.08] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
              >
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                disabled={entryIndex >= totalEntries - 1}
                onClick={onMoveEntryDown}
                aria-label="Mover bloco para baixo"
                title="Mover bloco para baixo"
                className="w-7 h-7 rounded-lg bg-[var(--surface)] hover:bg-[var(--surface-hover)] dark:bg-white/[0.04] dark:hover:bg-white/[0.08] border border-[var(--border-subtle)] dark:border-white/[0.08] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
              >
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Discreet "Editar" Action in Desktop Header */}
          {isDraft && (
            <button
              type="button"
              onClick={() => onOpenEditCombination(combination)}
              aria-label="Editar combinação"
              className="px-2.5 py-1 rounded-lg text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-white/[0.06] transition-colors min-h-[28px] flex items-center gap-1 cursor-pointer"
            >
              <Edit2 className="w-3 h-3 text-zinc-500 dark:text-zinc-400" />
              <span>Editar</span>
            </button>
          )}

          {/* Combination Contextual (•••) Menu */}
          {isDraft && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsCombMenuOpen((v) => !v)}
                aria-label="Opções da combinação"
                className="w-7 h-7 rounded-lg bg-[var(--surface)] hover:bg-[var(--surface-hover)] dark:bg-white/[0.04] dark:hover:bg-white/[0.08] border border-[var(--border-subtle)] dark:border-white/[0.08] text-[var(--text-secondary)] flex items-center justify-center transition-colors cursor-pointer"
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </button>

              {isCombMenuOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setIsCombMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 w-48 rounded-xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xl z-40 py-1 text-xs font-semibold text-[var(--text-primary)] animate-in fade-in zoom-in-95 duration-100 divide-y divide-[var(--border-subtle)]">
                    {(onMoveEntryUp || onMoveEntryDown || onMoveEntryStart || onMoveEntryEnd) && (
                      <div className="p-1 space-y-0.5">
                        {onMoveEntryUp && (
                          <button
                            type="button"
                            disabled={entryIndex === 0}
                            onClick={() => {
                              setIsCombMenuOpen(false);
                              onMoveEntryUp();
                            }}
                            className="w-full px-3 py-1.5 hover:bg-[var(--surface-subtle)] disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2 text-left cursor-pointer min-h-[30px]"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                            <span>Mover para cima</span>
                          </button>
                        )}
                        {onMoveEntryDown && (
                          <button
                            type="button"
                            disabled={entryIndex >= totalEntries - 1}
                            onClick={() => {
                              setIsCombMenuOpen(false);
                              onMoveEntryDown();
                            }}
                            className="w-full px-3 py-1.5 hover:bg-[var(--surface-subtle)] disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2 text-left cursor-pointer min-h-[30px]"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                            <span>Mover para baixo</span>
                          </button>
                        )}
                        {onMoveEntryStart && (
                          <button
                            type="button"
                            disabled={entryIndex === 0}
                            onClick={() => {
                              setIsCombMenuOpen(false);
                              onMoveEntryStart();
                            }}
                            className="w-full px-3 py-1.5 hover:bg-[var(--surface-subtle)] disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2 text-left cursor-pointer min-h-[30px]"
                          >
                            <ArrowUp className="w-3.5 h-3.5 text-emerald-500" />
                            <span>Mover para o início</span>
                          </button>
                        )}
                        {onMoveEntryEnd && (
                          <button
                            type="button"
                            disabled={entryIndex >= totalEntries - 1}
                            onClick={() => {
                              setIsCombMenuOpen(false);
                              onMoveEntryEnd();
                            }}
                            className="w-full px-3 py-1.5 hover:bg-[var(--surface-subtle)] disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2 text-left cursor-pointer min-h-[30px]"
                          >
                            <ArrowDown className="w-3.5 h-3.5 text-emerald-500" />
                            <span>Mover para o final</span>
                          </button>
                        )}
                        {onMoveEntryToPosition && totalEntries > 1 && (
                          <div className="px-3 py-1 flex items-center justify-between gap-2">
                            <span className="text-[11px] text-[var(--text-secondary)] font-medium">Posição:</span>
                            <select
                              value={entryIndex + 1}
                              onChange={(e) => {
                                setIsCombMenuOpen(false);
                                const targetPos = Number(e.target.value) - 1;
                                onMoveEntryToPosition(targetPos);
                              }}
                              className="px-2 py-0.5 rounded-lg bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-xs font-bold text-[var(--text-primary)] cursor-pointer"
                            >
                              {Array.from({ length: totalEntries }, (_, i) => (
                                <option key={i + 1} value={i + 1}>
                                  {i + 1}º de {totalEntries}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="p-1 space-y-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setIsCombMenuOpen(false);
                        onOpenEditCombination(combination);
                      }}
                      className="w-full px-3 py-2 hover:bg-[var(--surface-subtle)] flex items-center gap-2 text-left cursor-pointer min-h-[32px]"
                    >
                      <ZapIcon className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Editar combinação</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCombMenuOpen(false);
                        setIsReordering((prev) => !prev);
                      }}
                      className="w-full px-3 py-2 hover:bg-[var(--surface-subtle)] flex items-center gap-2 text-left cursor-pointer min-h-[32px]"
                    >
                      <MoveIcon className="w-3.5 h-3.5 text-amber-500" />
                      <span>{isReordering ? "Concluir reordenação" : "Reordenar exercícios"}</span>
                    </button>
                    {onUngroupCombination && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsCombMenuOpen(false);
                          if (confirm(`Desfazer este ${typeLabel} e manter os exercícios separados?`)) {
                            startTransition(() => onUngroupCombination(combination.publicId));
                          }
                        }}
                        className="w-full px-3 py-2 hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center gap-2 text-left cursor-pointer min-h-[32px]"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Desfazer combinação</span>
                      </button>
                    )}
                    {onDeleteCombination && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsCombMenuOpen(false);
                          if (confirm(`Excluir esta combinação ${typeLabel}?`)) {
                            startTransition(() => onDeleteCombination(combination.publicId, true));
                          }
                        }}
                        className="w-full px-3 py-2 hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center gap-2 text-left cursor-pointer min-h-[32px]"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Excluir combinação</span>
                      </button>
                    )}
                  </div>
                </div>
              </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Reorder Mode Banner */}
      {isReordering && (
        <div className="px-4 py-2 bg-amber-500/20 dark:bg-amber-950/60 border-b border-amber-500/30 flex items-center justify-between gap-2 text-xs font-bold text-amber-950 dark:text-amber-200">
          <div className="flex items-center gap-1.5 min-w-0">
            <MoveIcon className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span className="truncate">Modo reordenar: use as setas para ajustar a sequência</span>
          </div>
          <button
            type="button"
            onClick={() => setIsReordering(false)}
            className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shrink-0 cursor-pointer min-h-[36px]"
          >
            Concluir
          </button>
        </div>
      )}

      {/* Internal Exercise Rows (Clean rows, fully styled with semantic theme) */}
      <div className={`divide-y ${theme.dividerClass}`}>
        {items.map((item: WorkoutBlockItemDto, idx: number) => {
          const letter = LETTERS[idx] || String.fromCharCode(65 + idx);
          const summary = getItemPrescriptionSummary(item);

          return (
            <div
              key={item.publicId}
              draggable={isDraft}
              onDragStart={(e) => {
                if (!isDraft) return;
                e.dataTransfer.setData("text/plain", item.publicId);
                e.dataTransfer.effectAllowed = "move";
                setDraggedItemId(item.publicId);
              }}
              onDragOver={(e) => {
                if (!isDraft) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                if (dragOverItemId !== item.publicId) {
                  setDragOverItemId(item.publicId);
                }
              }}
              onDragLeave={() => {
                if (dragOverItemId === item.publicId) {
                  setDragOverItemId(null);
                }
              }}
              onDrop={async (e) => {
                if (!isDraft) return;
                e.preventDefault();
                const sourcePublicId = e.dataTransfer.getData("text/plain") || draggedItemId;
                setDraggedItemId(null);
                setDragOverItemId(null);
                if (!sourcePublicId || sourcePublicId === item.publicId) return;
                const fromIdx = items.findIndex((it) => it.publicId === sourcePublicId);
                const toIdx = items.findIndex((it) => it.publicId === item.publicId);
                if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return;
                const direction = toIdx < fromIdx ? "up" : "down";
                if (onMoveItemInCombination) {
                  await onMoveItemInCombination(combination.publicId, sourcePublicId, direction);
                }
              }}
              onDragEnd={() => {
                setDraggedItemId(null);
                setDragOverItemId(null);
              }}
              className={`space-y-0 transition-all ${
                dragOverItemId === item.publicId ? "bg-emerald-500/10 ring-1 ring-emerald-500/30" : ""
              }`}
            >
              <div
                onClick={() => {
                  if (isDraft) onOpenQuickEdit(item);
                }}
                role={isDraft ? "button" : undefined}
                tabIndex={isDraft ? 0 : undefined}
                onKeyDown={(e) => {
                  if (isDraft && (e.key === "Enter" || e.key === " ")) {
                    e.preventDefault();
                    onOpenQuickEdit(item);
                  }
                }}
                className={`py-3 px-3.5 sm:px-4 sm:py-3 flex items-center justify-between gap-2.5 ${theme.memberRowClass} transition-colors w-full max-w-full min-w-0 select-none group ${
                  isDraft ? "cursor-pointer active:scale-[0.99]" : ""
                }`}
              >
                {/* Left: Letter Badge + Info */}
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                  <div className={`w-7 h-7 rounded-xl ${theme.letterAvatarClass} text-xs flex items-center justify-center shrink-0 shadow-2xs`}>
                    {letter}.
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="text-xs sm:text-sm font-extrabold text-current line-clamp-2 break-words">
                        {item.exerciseNameSnapshot}
                      </h4>
                      {item.isCustomExercise && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 dark:bg-black/20 text-current border border-current/20">
                          Personalizado
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs font-semibold text-current flex-wrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md border font-semibold ${theme.chipBgClass}`}>
                        {summary.seriesCount} voltas · {summary.repsText}
                        {summary.loadKg != null ? ` · ${summary.loadKg}kg` : ""}
                      </span>
                    </div>
                    {item.notes && item.notes.trim() && (
                      <div className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-800 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md break-words">
                        ⚡ {item.notes.trim()}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Reorder arrows only in reorder mode, clean edit hint in normal mode */}
                {isDraft && isReordering && onMoveItemInCombination && (
                  <div className="flex items-center gap-1 shrink-0 animate-in fade-in duration-100">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={(e) => {
                        e.stopPropagation();
                        onMoveItemInCombination(combination.publicId, item.publicId, "up");
                      }}
                      aria-label="Mover para cima na combinação"
                      title="Mover para cima na combinação"
                      className="w-11 h-11 sm:w-8 sm:h-8 rounded-xl bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 border border-current/20 flex items-center justify-center text-current disabled:opacity-25 disabled:cursor-not-allowed cursor-pointer transition-colors min-h-[44px] min-w-[44px] sm:min-h-[32px] sm:min-w-[32px]"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === items.length - 1}
                      onClick={(e) => {
                        e.stopPropagation();
                        onMoveItemInCombination(combination.publicId, item.publicId, "down");
                      }}
                      aria-label="Mover para baixo na combinação"
                      title="Mover para baixo na combinação"
                      className="w-11 h-11 sm:w-8 sm:h-8 rounded-xl bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 border border-current/20 flex items-center justify-center text-current disabled:opacity-25 disabled:cursor-not-allowed cursor-pointer transition-colors min-h-[44px] min-w-[44px] sm:min-h-[32px] sm:min-w-[32px]"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Normal mode: clean edit hint */}
                {isDraft && !isReordering && (
                  <div className="flex items-center gap-1 shrink-0 text-current/50 group-hover:text-current transition-colors">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenActions(item, idx, items.length, combination.publicId);
                      }}
                      aria-label="Mais opções"
                      title="Mais opções do exercício"
                      className="w-8 h-8 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center text-current opacity-60 hover:opacity-100 transition-all cursor-pointer"
                    >
                      <MoreVertical className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Transition connector between exercises */}
              {idx < items.length - 1 && (
                <div
                  className={`py-1.5 px-4 text-[10px] font-bold flex items-center justify-center gap-2 border-y ${theme.connectorClass}`}
                  title="Transição direta (sem descanso)"
                >
                  <span className="shrink-0 flex items-center gap-1.5 tracking-wide">↓ Transição direta (sem descanso) ↓</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Combination Footer: Rest between rounds */}
      <div className={`px-4 py-3 ${theme.footerBgClass} flex items-center justify-between gap-2 text-xs font-semibold`}>
        <span>
          Descanso após a volta:{" "}
          <strong className="font-black text-current">{restSec}s</strong>
          {activeRest.isActive && activeRest.activity ? ` (${activeRest.activity})` : ""}
        </span>
        {isDraft && (
          <button
            type="button"
            onClick={() => onOpenEditCombination(combination)}
            className="text-[11px] font-bold underline transition-colors cursor-pointer text-current opacity-80 hover:opacity-100"
          >
            Ajustar
          </button>
        )}
      </div>

      {/* Formal Combination Sequence Video Modal */}
      <SequenceExecutionModal
        isOpen={isSeqModalOpen}
        onClose={() => setIsSeqModalOpen(false)}
        experience={combSeqExp}
      />
    </div>
  );
}

// Aliases for backwards compatibility
export const MobileCombinationBlock = UnifiedCombinationBlock;
export const CombinationCard = UnifiedCombinationBlock;

export function MobileExerciseCard({
  item,
  executionIndex,
  isDraft,
  isSelectionMode,
  isSelected,
  selectionIndex,
  inCombination,
  onToggleSelect,
  onOpenQuickEdit,
  onOpenActions,
  onOpenExecutionModal,
  onOpenConfigureSequence,
}: {
  item: WorkoutBlockItemDto;
  itemIndex: number;
  totalItems: number;
  executionIndex?: number;
  isDraft: boolean;
  categoryPublicId: string;
  allCategories?: { publicId: string; title: string }[];
  isSelectionMode?: boolean;
  isSelected?: boolean;
  selectionIndex?: number;
  inCombination?: boolean;
  onToggleSelect?: () => void;
  onOpenQuickEdit: () => void;
  onOpenActions: () => void;
  onOpenExecutionModal: () => void;
  onOpenConfigureSequence?: (
    item: WorkoutBlockItemDto,
    movements: DetectedMovement[]
  ) => void;
  onMoveUp?: () => Promise<void>;
  onMoveDown?: () => Promise<void>;
  onCombineFromHere?: () => void;
}) {
  const summary = getItemPrescriptionSummary(item);
  const isSequence = Boolean(item.isCustomExercise && item.methodConfig?.customSequence);
  const sequenceExp = isSequence ? buildSequenceMediaFromCustomItem(item) : null;
  const [isSequenceExecutionOpen, setIsSequenceExecutionOpen] = useState(false);
  const detectedSeq = !isSequence ? detectExerciseSequenceFromText(item.exerciseNameSnapshot) : null;
  const hasMedia = !!(item.customVideoUrl || item.pinnedMedia);

  // If in selection mode: entire card is touch-target for selecting
  if (isSelectionMode) {
    return (
      <div
        data-testid="mobile-exercise-card-selectable"
        onClick={onToggleSelect}
        role="checkbox"
        aria-checked={isSelected}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggleSelect?.();
          }
        }}
        className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between gap-3 ${
          isSelected
            ? "border-emerald-500 bg-emerald-500/15 dark:bg-emerald-950/40 shadow-sm ring-2 ring-emerald-500/30"
            : "border-dashed border-[var(--border-default)] bg-[var(--surface)] hover:border-emerald-500/40"
        }`}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div
            className={`w-8 h-8 rounded-xl border-2 flex items-center justify-center shrink-0 transition-all font-black text-xs ${
              isSelected
                ? "border-emerald-600 bg-emerald-600 text-white shadow-xs scale-105"
                : "border-[var(--border-strong)] bg-[var(--surface-subtle)] text-[var(--text-tertiary)]"
            }`}
          >
            {isSelected ? (selectionIndex ?? 1) : "+"}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h4 className="text-xs sm:text-sm font-extrabold text-[var(--text-primary)] line-clamp-2 break-words">
                {item.exerciseNameSnapshot}
              </h4>
              {isSelected && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-600 text-white shadow-2xs shrink-0">
                  {selectionIndex ?? 1}º na combinação
                </span>
              )}
            </div>
            {item.notes && item.notes.trim() && (
              <p className="text-[11px] font-medium text-amber-700/90 dark:text-amber-400/90">
                ⚡ Método: {item.notes.trim()}
              </p>
            )}
            <p className="text-[11px] font-semibold text-[var(--text-secondary)] truncate">
              {summary.seriesCount} séries • {summary.repsText}
              {summary.loadKg != null ? ` • ${summary.loadKg}kg` : ""}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Normal Mobile Card: Compact, tap opens "O que deseja fazer?" action sheet
  return (
    <div
      data-testid="mobile-exercise-card"
      onClick={() => {
        if (isSelectionMode && !inCombination) {
          onToggleSelect?.();
        } else if (isDraft) {
          onOpenQuickEdit();
        }
      }}
      role={isDraft ? "button" : undefined}
      tabIndex={isDraft ? 0 : undefined}
      onKeyDown={(e) => {
        if (isDraft && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onOpenQuickEdit();
        }
      }}
      aria-label={isDraft ? `Opções de ${item.exerciseNameSnapshot}` : undefined}
      className={`p-4 sm:p-4.5 rounded-2xl border border-zinc-200/90 dark:border-zinc-800 border-t-white/80 dark:border-t-white/10 border-b-zinc-300/80 dark:border-b-black/70 bg-zinc-50/90 dark:bg-zinc-900/90 shadow-[0_2px_4px_rgba(0,0,0,0.05),0_1px_2px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_8px_rgba(0,0,0,0.4)] hover:border-emerald-500/30 transition-all space-y-3 select-none ${
        isDraft ? "cursor-pointer active:scale-[0.99]" : ""
      }`}
    >
      {/* 1. Header: Exercise Name, Execution #, Group & Actions */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            {executionIndex != null && (
              <span className="text-[11px] font-black px-2 py-0.5 rounded-lg bg-[var(--surface-subtle)] text-[var(--text-secondary)] border border-[var(--border-subtle)] shrink-0">
                #{executionIndex}
              </span>
            )}
            <h4 className="text-sm sm:text-base font-extrabold text-[var(--text-primary)] leading-snug line-clamp-2 break-words">
              {item.exerciseNameSnapshot}
            </h4>
            {item.isCustomExercise && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--surface-subtle)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                Personalizado
              </span>
            )}
          </div>
          {(item.muscleGroupSnapshot || item.equipmentSnapshot) && (
            <p className="text-xs font-medium text-[var(--text-tertiary)] truncate">
              {[item.muscleGroupSnapshot, item.equipmentSnapshot].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {sequenceExp?.hasPlayableMedia ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsSequenceExecutionOpen(true);
              }}
              aria-label="Ver sequência de exercícios"
              className="px-2.5 py-1.5 rounded-xl bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] border border-[var(--border-subtle)] text-[var(--text-secondary)] font-bold text-xs transition-colors min-h-[36px] flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <VideoIcon className="w-3.5 h-3.5 text-emerald-600" />
              <span>Sequência</span>
            </button>
          ) : hasMedia ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenExecutionModal();
              }}
              aria-label="Ver vídeo do exercício"
              className="p-2 rounded-xl bg-[var(--surface-subtle)] hover:bg-emerald-500/10 text-emerald-600 border border-[var(--border-subtle)] transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center shrink-0 cursor-pointer"
            >
              <VideoIcon className="w-4 h-4" />
            </button>
          ) : null}

          {isDraft && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenActions();
              }}
              aria-label="Mais opções"
              className="w-10 h-10 min-h-[40px] min-w-[40px] rounded-xl bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center transition-colors cursor-pointer"
              title="Mais opções do exercício"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Prescription: High Visual Prominence */}
      <div className="text-sm font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5 flex-wrap">
        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-white/[0.05] border border-zinc-200 dark:border-white/[0.08] text-zinc-900 dark:text-zinc-100 font-semibold">
          {summary.seriesCount} {summary.seriesCount === 1 ? "série" : "séries"} · {summary.repsText}
        </span>
        {summary.loadKg != null && (
          <span className="text-[var(--text-primary)] font-bold">· {summary.loadKg} kg</span>
        )}
        <span className="text-xs font-semibold text-[var(--text-secondary)]">
          · {summary.restSeconds}s descanso
        </span>
      </div>

      {/* 3. Technique / Method Note: Highlighted */}
      {item.notes && item.notes.trim() && (
        <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700/90 dark:text-amber-400/90 bg-amber-500/10 px-2 py-0.5 rounded-md w-fit">
          <span>⚡ {item.notes.trim()}</span>
        </div>
      )}

      {/* Sequence movements list */}
      {isSequence && Array.isArray((item.methodConfig?.customSequence as { movements?: unknown[] })?.movements) && (((item.methodConfig?.customSequence as { movements?: unknown[] })?.movements?.length ?? 0) > 0) && (
        <div className="text-[11px] text-[var(--text-secondary)] font-medium bg-[var(--surface-subtle)]/70 px-2 py-1 rounded-lg border border-[var(--border-subtle)] w-fit max-w-full">
          <span className="font-semibold text-purple-700 dark:text-purple-300 mr-1">Movimentos:</span>
          <span>
            {((item.methodConfig?.customSequence as { movements: unknown[] }).movements).map((m: unknown, idx: number) => {
              const label = typeof m === "string" ? m : (m as { label?: string })?.label || `Movimento ${idx + 1}`;
              const hint = typeof m === "object" && m !== null
                ? ((m as { repsText?: string })?.repsText || (m as { durationText?: string })?.durationText)
                : null;
              return hint ? `${label} (${hint})` : label;
            }).join(" • ")}
          </span>
        </div>
      )}

      {/* Discreet prompt when sequence detected in text */}
      {isDraft && !isSequence && detectedSeq?.detected && detectedSeq.movements.length >= 2 && onOpenConfigureSequence && (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-700 dark:text-purple-300 text-[11px] font-semibold w-fit">
          <span>✨ Sequência ({detectedSeq.movements.length} movs)</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenConfigureSequence(item, detectedSeq.movements);
            }}
            className="underline hover:text-purple-900 dark:hover:text-purple-100 cursor-pointer ml-1 font-bold"
          >
            Configurar
          </button>
        </div>
      )}

      {/* Sequence Execution Modal */}
      <SequenceExecutionModal
        isOpen={isSequenceExecutionOpen}
        onClose={() => setIsSequenceExecutionOpen(false)}
        experience={sequenceExp}
      />
    </div>
  );
}

export function QuickEditExerciseSheet({
  isOpen,
  item,
  onClose,
  onSave,
  consultancySlug,
}: {
  isOpen: boolean;
  item: WorkoutBlockItemDto;
  onClose: () => void;
  onSave: (config: QuickConfigInput) => Promise<void>;
  consultancySlug?: string;
}) {
  const summary = getItemPrescriptionSummary(item);
  const [sets, setSets] = useState<number>(summary.seriesCount);
  const [repsDraft, setRepsDraft] = useState<string>(summary.repsDraft);
  const [load, setLoad] = useState<string>(
    summary.loadKg != null ? String(summary.loadKg) : ""
  );
  const [rest, setRest] = useState<number>(summary.restSeconds);
  const [notes, setNotes] = useState<string>(item.notes || "");
  const [videoUrl, setVideoUrl] = useState<string | null>(item.customVideoUrl ?? null);
  const [saveToLibrary, setSaveToLibrary] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [autosaveStatus, setAutosaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const isDirtyRef = useRef(false);
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const latestValuesRef = useRef({
    sets,
    repsDraft,
    load,
    rest,
    notes,
    videoUrl,
    saveToLibrary,
  });

  useEffect(() => {
    latestValuesRef.current = {
      sets,
      repsDraft,
      load,
      rest,
      notes,
      videoUrl,
      saveToLibrary,
    };
  }, [sets, repsDraft, load, rest, notes, videoUrl, saveToLibrary]);

  const REPS_CHIPS = ["8-10", "10-12", "12-15", "Falha"];
  const REST_CHIPS = [30, 45, 60, 90, 120];

  const flushSave = useCallback(async () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    const cur = latestValuesRef.current;
    const parsedReps = parseRepsInput(cur.repsDraft);
    const numLoad = cur.load.trim() !== "" && !isNaN(Number(cur.load)) ? Number(cur.load) : null;
    setAutosaveStatus("saving");
    setIsSaving(true);
    try {
      await onSave({
        seriesCount: Math.max(1, Math.min(20, cur.sets)),
        reps: parsedReps?.repsMin ?? 10,
        targetRepsMax: parsedReps?.repsMax ?? null,
        restSeconds: Math.max(0, cur.rest),
        loadKg: numLoad,
        notes: cur.notes.trim() || null,
        customVideoUrl: cur.videoUrl,
        saveToExerciseLibrary: cur.saveToLibrary,
      });
      isDirtyRef.current = false;
      setAutosaveStatus("saved");
      return true;
    } catch {
      setAutosaveStatus("error");
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [onSave]);

  const scheduleSave = useCallback(() => {
    isDirtyRef.current = true;
    setAutosaveStatus("saving");
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = setTimeout(() => {
      flushSave();
    }, 600);
  }, [flushSave]);

  async function handleCloseWithFlush() {
    if (isDirtyRef.current || saveTimerRef.current) {
      const ok = await flushSave();
      if (!ok) {
        return;
      }
    }
    onClose();
  }

  // Flush on unmount if dirty
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={handleCloseWithFlush}
      title={
        <div className="space-y-0.5">
          <div className="text-xs font-bold text-emerald-600 uppercase tracking-wide">
            Editar Prescrição
          </div>
          <div className="text-sm sm:text-base font-extrabold text-[var(--text-primary)] truncate max-w-xs">
            {item.exerciseNameSnapshot}
          </div>
        </div>
      }
      footer={
        <div className="flex items-center justify-between gap-3 w-full">
          <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
            {autosaveStatus === "saving" ? (
              <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                Salvando…
              </span>
            ) : autosaveStatus === "saved" ? (
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                Salvo automaticamente
              </span>
            ) : autosaveStatus === "error" ? (
              <button
                type="button"
                onClick={() => flushSave()}
                className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-semibold hover:underline cursor-pointer"
              >
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Erro ao salvar · Tentar novamente</span>
              </button>
            ) : (
              <span className="text-[var(--text-tertiary)] font-medium">Salvo automaticamente</span>
            )}
          </div>
          <button
            type="button"
            disabled={isSaving}
            onClick={handleCloseWithFlush}
            className="py-2.5 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition-all min-h-[44px] flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Concluir</span>
          </button>
        </div>
      }
    >
      <div className="space-y-5 pb-2">
        {/* Séries Stepper */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[var(--text-secondary)] uppercase">
            Séries
          </label>
          <div className="flex items-center justify-between p-2 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-default)]">
            <button
              type="button"
              onClick={() => {
                setSets((s) => {
                  const n = Math.max(1, s - 1);
                  latestValuesRef.current.sets = n;
                  scheduleSave();
                  return n;
                });
              }}
              aria-label="Diminuir séries"
              className="w-12 h-12 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-[var(--text-primary)] border border-[var(--border-subtle)] font-black text-xl flex items-center justify-center cursor-pointer min-h-[44px] min-w-[44px]"
            >
              -
            </button>
            <div className="text-center">
              <span className="text-2xl font-black text-[var(--text-primary)]">{sets}</span>
              <span className="text-xs font-bold text-[var(--text-secondary)] ml-1">séries</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setSets((s) => {
                  const n = Math.min(20, s + 1);
                  latestValuesRef.current.sets = n;
                  scheduleSave();
                  return n;
                });
              }}
              aria-label="Aumentar séries"
              className="w-12 h-12 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-[var(--text-primary)] border border-[var(--border-subtle)] font-black text-xl flex items-center justify-center cursor-pointer min-h-[44px] min-w-[44px]"
            >
              +
            </button>
          </div>
        </div>

        {/* Repetições */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[var(--text-secondary)] uppercase">
            Repetições
          </label>
          <input
            type="text"
            value={repsDraft}
            onChange={(e) => {
              setRepsDraft(e.target.value);
              latestValuesRef.current.repsDraft = e.target.value;
              scheduleSave();
            }}
            onBlur={() => {
              if (isDirtyRef.current) flushSave();
            }}
            placeholder="Ex: 10, 8-12, Falha"
            className="w-full px-4 py-3 rounded-2xl border border-[var(--border-default)] bg-[var(--surface)] text-[var(--text-primary)] text-base font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none min-h-[48px]"
          />
          <div className="flex items-center gap-1.5 pt-1 flex-wrap">
            {REPS_CHIPS.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => {
                  setRepsDraft(chip);
                  latestValuesRef.current.repsDraft = chip;
                  scheduleSave();
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer min-h-[36px] ${
                  repsDraft === chip
                    ? "bg-emerald-600 text-white border-emerald-600"
                    : "bg-[var(--surface)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:bg-[var(--surface-hover)]"
                }`}
              >
                {chip}
              </button>
            ))}
          </div>
        </div>

        {/* Carga (kg) */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[var(--text-secondary)] uppercase">
            Carga (kg)
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const cur = Number(load) || 0;
                const nextVal = String(Math.max(0, cur - 2.5));
                setLoad(nextVal);
                latestValuesRef.current.load = nextVal;
                scheduleSave();
              }}
              className="px-3.5 py-2.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)] font-bold text-xs min-h-[44px] cursor-pointer"
            >
              -2.5 kg
            </button>
            <input
              type="text"
              inputMode="decimal"
              value={load}
              onChange={(e) => {
                setLoad(e.target.value);
                latestValuesRef.current.load = e.target.value;
                scheduleSave();
              }}
              onBlur={() => {
                if (isDirtyRef.current) flushSave();
              }}
              placeholder="0"
              className="flex-1 px-4 py-3 text-center rounded-2xl border border-[var(--border-default)] bg-[var(--surface)] text-[var(--text-primary)] text-base font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none min-h-[48px]"
            />
            <button
              type="button"
              onClick={() => {
                const cur = Number(load) || 0;
                const nextVal = String(cur + 2.5);
                setLoad(nextVal);
                latestValuesRef.current.load = nextVal;
                scheduleSave();
              }}
              className="px-3.5 py-2.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)] font-bold text-xs min-h-[44px] cursor-pointer"
            >
              +2.5 kg
            </button>
          </div>
        </div>

        {/* Descanso */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[var(--text-secondary)] uppercase">
            Descanso entre séries
          </label>
          <div className="flex items-center justify-between p-2 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-default)]">
            <button
              type="button"
              onClick={() => {
                setRest((r) => {
                  const nextVal = Math.max(0, r - 15);
                  latestValuesRef.current.rest = nextVal;
                  scheduleSave();
                  return nextVal;
                });
              }}
              aria-label="Diminuir descanso"
              className="w-12 h-12 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-[var(--text-primary)] border border-[var(--border-subtle)] font-black text-xl flex items-center justify-center cursor-pointer min-h-[44px] min-w-[44px]"
            >
              -
            </button>
            <div className="text-center">
              <span className="text-2xl font-black text-[var(--text-primary)]">{rest}</span>
              <span className="text-xs font-bold text-[var(--text-secondary)] ml-1">segundos</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setRest((r) => {
                  const nextVal = Math.min(600, r + 15);
                  latestValuesRef.current.rest = nextVal;
                  scheduleSave();
                  return nextVal;
                });
              }}
              aria-label="Aumentar descanso"
              className="w-12 h-12 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-[var(--text-primary)] border border-[var(--border-subtle)] font-black text-xl flex items-center justify-center cursor-pointer min-h-[44px] min-w-[44px]"
            >
              +
            </button>
          </div>
          <div className="flex items-center gap-1.5 pt-1 flex-wrap">
            {REST_CHIPS.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => {
                  setRest(chip);
                  latestValuesRef.current.rest = chip;
                  scheduleSave();
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer min-h-[36px] ${
                  rest === chip
                    ? "bg-emerald-600 text-white border-emerald-600"
                    : "bg-[var(--surface)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:bg-[var(--surface-hover)]"
                }`}
              >
                {chip}s
              </button>
            ))}
          </div>
        </div>

        {/* Observações */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[var(--text-secondary)] uppercase">
            Observações / Método (opcional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              latestValuesRef.current.notes = e.target.value;
              scheduleSave();
            }}
            onBlur={() => {
              if (isDirtyRef.current) flushSave();
            }}
            rows={2}
            placeholder="Ex: Drop-set na última, cadência 3010..."
            className="w-full px-3 py-2 text-xs sm:text-sm font-medium rounded-xl border border-[var(--border-default)] bg-[var(--surface)] text-[var(--text-primary)] focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </div>

        {/* Vídeo de Execução */}
        <ExerciseVideoEditorSection
          currentVideoUrl={videoUrl}
          fallbackMedia={item.pinnedMedia}
          isCustomExercise={Boolean(item.isCustomExercise || item.customExercisePublicId)}
          canSaveToLibrary={Boolean(!item.isCustomExercise && item.exercisePublicId)}
          consultancySlug={consultancySlug}
          exercisePublicId={item.exercisePublicId}
          exerciseName={item.exerciseNameSnapshot}
          onVideoChange={(newUrl, toLibrary) => {
            setVideoUrl(newUrl);
            latestValuesRef.current.videoUrl = newUrl;
            if (toLibrary !== undefined) {
              setSaveToLibrary(toLibrary);
              latestValuesRef.current.saveToLibrary = toLibrary;
            }
            scheduleSave();
          }}
          disabled={isSaving}
        />
      </div>
    </BottomSheet>
  );
}

export function EditCombinationSheet({
  isOpen,
  combination,
  onClose,
  onSave,
  onUngroup,
  onMoveItem,
  onRemoveItem,
}: {
  isOpen: boolean;
  combination: WorkoutItemCombinationDto;
  onClose: () => void;
  onSave: (input: {
    combinationType?: WorkoutCombinationType;
    title?: string;
    restAfterSeconds?: number;
  }) => Promise<void>;
  onUngroup: () => Promise<void>;
  onMoveItem?: (combinationPublicId: string, itemPublicId: string, direction: "up" | "down") => Promise<void>;
  onRemoveItem?: (combinationPublicId: string, itemPublicId: string) => Promise<void>;
}) {
  const parsedRest = parseActiveRest(combination.title);
  const [combType, setCombType] = useState<WorkoutCombinationType>(combination.combinationType);
  const [rest, setRest] = useState<number>(combination.restAfterSeconds ?? 60);
  const [isRestActive, setIsRestActive] = useState<boolean>(parsedRest.isActive);
  const [activeActivity, setActiveActivity] = useState<string>(parsedRest.activity);
  const [customTitle] = useState<string>(
    combination.title ? combination.title.replace(/•?\s*Descanso Ativo:.*$/i, "").trim() : ""
  );
  const [isSaving, setIsSaving] = useState(false);
  const [autosaveStatus, setAutosaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [, startTransition] = useTransition();

  const isDirtyRef = useRef(false);
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const latestCombRef = useRef({
    combType,
    isRestActive,
    activeActivity,
    customTitle,
    rest,
  });
  useEffect(() => {
    latestCombRef.current = {
      combType,
      isRestActive,
      activeActivity,
      customTitle,
      rest,
    };
  }, [combType, isRestActive, activeActivity, customTitle, rest]);

  const flushSave = useCallback(async () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    const cur = latestCombRef.current;
    const formattedTitle = formatActiveRestTitle(cur.isRestActive, cur.activeActivity, cur.customTitle);
    setAutosaveStatus("saving");
    setIsSaving(true);
    try {
      await onSave({
        combinationType: cur.combType,
        title: formattedTitle,
        restAfterSeconds: cur.rest,
      });
      isDirtyRef.current = false;
      setAutosaveStatus("saved");
    } catch {
      setAutosaveStatus("idle");
    } finally {
      setIsSaving(false);
    }
  }, [onSave]);

  const scheduleSave = useCallback(() => {
    isDirtyRef.current = true;
    setAutosaveStatus("saving");
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = setTimeout(() => {
      flushSave();
    }, 600);
  }, [flushSave]);

  async function handleCloseWithFlush() {
    if (isDirtyRef.current || saveTimerRef.current) {
      await flushSave();
    }
    onClose();
  }

  // Flush on unmount if dirty
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  const ACTIVITY_PRESETS = ["Caminhada leve", "Polichinelo", "Prancha", "Mobilidade"];
  const [itemsOverride, setItemsOverride] = useState<WorkoutBlockItemDto[] | null>(null);
  const [prevCombItems, setPrevCombItems] = useState(combination.items);

  if (combination.items !== prevCombItems) {
    setPrevCombItems(combination.items);
    setItemsOverride(null);
  }

  const currentItems = itemsOverride ?? [...(combination.items || [])].sort((a, b) => a.sortOrder - b.sortOrder);

  async function handleMoveItemLocally(itemPublicId: string, direction: "up" | "down") {
    const idx = currentItems.findIndex((it) => it.publicId === itemPublicId);
    if (idx < 0) return;
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= currentItems.length) return;

    const next = [...currentItems];
    const [moved] = next.splice(idx, 1);
    next.splice(targetIdx, 0, moved);
    setItemsOverride(next);

    if (onMoveItem) {
      await onMoveItem(combination.publicId, itemPublicId, direction);
    }
  }

    const currentTheme = getCombinationTheme(combType);

    return (
      <BottomSheet
        isOpen={isOpen}
        onClose={handleCloseWithFlush}
        title={
          <div className="space-y-0.5">
            <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-extrabold uppercase tracking-wide ${currentTheme.badgeClass}`}>
              Editar {COMBINATION_TYPE_LABELS[combType]}
            </div>
            <div className="text-sm sm:text-base font-extrabold text-[var(--text-primary)]">
              {COMBINATION_TYPE_LABELS[combType]} ({currentItems.length} exercícios)
            </div>
          </div>
        }
      footer={
        <div className="flex items-center justify-between gap-3 w-full">
          <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
            {autosaveStatus === "saving" ? (
              <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                Salvando…
              </span>
            ) : autosaveStatus === "saved" ? (
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                Salvo automaticamente
              </span>
            ) : (
              <span className="text-[var(--text-tertiary)] font-medium">Salvo automaticamente</span>
            )}
          </div>
          <button
            type="button"
            disabled={isSaving}
            onClick={handleCloseWithFlush}
            className="py-2.5 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition-all min-h-[44px] flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Concluir</span>
          </button>
        </div>
      }
    >
      <div className="space-y-5 pb-2">
        {/* Tipo da Combinação */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[var(--text-secondary)] uppercase">
            Tipo
          </label>
          <div className="flex items-center gap-1.5 flex-wrap">
            {(["BI_SET", "TRI_SET", "SUPERSET", "GIANT_SET", "CIRCUIT"] as WorkoutCombinationType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setCombType(t);
                  latestCombRef.current.combType = t;
                  scheduleSave();
                }}
                className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all min-h-[44px] cursor-pointer ${
                  combType === t
                    ? `${COMBINATION_THEMES[t]?.selectorActiveClass || "bg-blue-600 text-white border-blue-600 shadow-xs"}`
                    : "bg-[var(--surface-subtle)] text-[var(--text-secondary)] border-[var(--border-default)]"
                }`}
              >
                {COMBINATION_TYPE_LABELS[t]}
              </button>
            ))}
          </div>
        </div>

        {/* Descanso Passivo vs Ativo */}
        <div className="space-y-2 p-3 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-default)]">
          <label className="text-xs font-bold text-[var(--text-secondary)] uppercase">
            Descanso após a rodada
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setIsRestActive(false);
                latestCombRef.current.isRestActive = false;
                scheduleSave();
              }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold min-h-[44px] transition-all cursor-pointer ${
                !isRestActive
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border-subtle)]"
              }`}
            >
              ⏸️ Passivo
            </button>
            <button
              type="button"
              onClick={() => {
                setIsRestActive(true);
                latestCombRef.current.isRestActive = true;
                scheduleSave();
              }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold min-h-[44px] transition-all cursor-pointer ${
                isRestActive
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border-subtle)]"
              }`}
            >
              🏃 Ativo
            </button>
          </div>

          {/* Stepper */}
          <div className="flex items-center justify-between p-2 rounded-xl bg-[var(--surface)] border border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={() => {
                setRest((r) => {
                  const nextVal = Math.max(0, r - 15);
                  latestCombRef.current.rest = nextVal;
                  scheduleSave();
                  return nextVal;
                });
              }}
              className="w-11 h-11 rounded-lg bg-[var(--surface-subtle)] text-[var(--text-primary)] font-black text-xl flex items-center justify-center cursor-pointer min-h-[44px] min-w-[44px]"
            >
              -
            </button>
            <div className="text-center">
              <span className="text-xl font-black text-[var(--text-primary)]">{rest}</span>
              <span className="text-xs font-bold text-[var(--text-secondary)] ml-1">segundos</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setRest((r) => {
                  const nextVal = Math.min(600, r + 15);
                  latestCombRef.current.rest = nextVal;
                  scheduleSave();
                  return nextVal;
                });
              }}
              className="w-11 h-11 rounded-lg bg-[var(--surface-subtle)] text-[var(--text-primary)] font-black text-xl flex items-center justify-center cursor-pointer min-h-[44px] min-w-[44px]"
            >
              +
            </button>
          </div>

          {/* Atividade se Ativo */}
          {isRestActive && (
            <div className="space-y-1.5 pt-1">
              <input
                type="text"
                value={activeActivity}
                onChange={(e) => {
                  setActiveActivity(e.target.value);
                  latestCombRef.current.activeActivity = e.target.value;
                  scheduleSave();
                }}
                onBlur={() => {
                  if (isDirtyRef.current) flushSave();
                }}
                placeholder="Atividade (ex: Caminhada leve, polichinelo...)"
                className="w-full px-3 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface)] text-xs font-bold text-[var(--text-primary)] focus:ring-2 focus:ring-emerald-500 focus:outline-none min-h-[44px]"
              />
              <div className="flex items-center gap-1.5 flex-wrap">
                {ACTIVITY_PRESETS.map((act) => (
                  <button
                    key={act}
                    type="button"
                    onClick={() => {
                      setActiveActivity(act);
                      latestCombRef.current.activeActivity = act;
                      scheduleSave();
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer min-h-[32px] ${
                      activeActivity === act
                        ? "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40 font-bold"
                        : "bg-[var(--surface)] text-[var(--text-secondary)] border-[var(--border-subtle)]"
                    }`}
                  >
                    {act}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Ordem dos Exercícios */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-[var(--text-secondary)] uppercase">
            Exercícios na combinação
          </label>
          <div className="space-y-1.5">
            {currentItems.map((it, idx) => (
              <div
                key={it.publicId}
                className="p-2.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className={`w-6 h-6 rounded-lg ${currentTheme.letterAvatarClass} text-xs flex items-center justify-center shrink-0`}>
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span className="text-xs font-bold text-[var(--text-primary)] truncate">
                    {it.exerciseNameSnapshot}
                  </span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {onMoveItem && (
                    <>
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => startTransition(() => handleMoveItemLocally(it.publicId, "up"))}
                        aria-label="Mover para cima"
                        className="w-9 h-9 rounded-lg bg-[var(--surface)] border border-[var(--border-subtle)] flex items-center justify-center disabled:opacity-30 cursor-pointer min-h-[36px] min-w-[36px]"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === currentItems.length - 1}
                        onClick={() => startTransition(() => handleMoveItemLocally(it.publicId, "down"))}
                        aria-label="Mover para baixo"
                        className="w-9 h-9 rounded-lg bg-[var(--surface)] border border-[var(--border-subtle)] flex items-center justify-center disabled:opacity-30 cursor-pointer min-h-[36px] min-w-[36px]"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                  {onRemoveItem && currentItems.length > 2 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Remover "${it.exerciseNameSnapshot}" desta combinação?`)) {
                          startTransition(() => onRemoveItem(combination.publicId, it.publicId));
                        }
                      }}
                      aria-label="Remover da combinação"
                      title="Remover da combinação"
                      className="w-9 h-9 rounded-lg bg-[var(--surface)] hover:bg-rose-500/10 text-[var(--text-tertiary)] hover:text-rose-600 border border-[var(--border-subtle)] flex items-center justify-center cursor-pointer min-h-[36px] min-w-[36px] transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Desfazer Combinação */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => {
              if (confirm("Desfazer combinação e manter exercícios como individuais?")) {
                onUngroup();
              }
            }}
            className="w-full py-3 px-4 rounded-xl border border-rose-500/30 hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold text-xs transition-colors min-h-[44px] cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Trash2 className="w-4 h-4" />
            <span>Desfazer Combinação</span>
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}

export function AddExerciseActionSheet({
  isOpen,
  onClose,
  onSelectLibrary,
  onSelectCustom,
  onSelectCombine,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelectLibrary: () => void;
  onSelectCustom: () => void;
  onSelectCombine?: () => void;
}) {
  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Adicionar Exercício"
      footer={
        <button
          type="button"
          onClick={onClose}
          className="w-full py-3 px-4 rounded-2xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-secondary)] font-bold text-sm min-h-[48px] cursor-pointer"
        >
          Cancelar
        </button>
      }
    >
      <div className="space-y-3 pb-2">
        <button
          type="button"
          onClick={onSelectLibrary}
          className="w-full p-4 rounded-2xl border-2 border-emerald-500/30 hover:border-emerald-500 bg-emerald-500/5 hover:bg-emerald-500/10 transition-all text-left flex items-center gap-3.5 min-h-[64px] cursor-pointer"
        >
          <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <SearchIcon className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-bold text-[var(--text-primary)]">
              Buscar na Biblioteca
            </h4>
            <p className="text-xs text-[var(--text-secondary)]">
              Busque exercícios por nome, equipamento ou grupo muscular
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={onSelectCustom}
          className="w-full p-4 rounded-2xl border border-[var(--border-default)] hover:border-violet-500/50 bg-[var(--surface-subtle)] hover:bg-violet-500/5 transition-all text-left flex items-center gap-3.5 min-h-[64px] cursor-pointer"
        >
          <div className="w-12 h-12 rounded-xl bg-violet-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <SparklesIcon className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-bold text-[var(--text-primary)]">
              Exercício Personalizado
            </h4>
            <p className="text-xs text-[var(--text-secondary)]">
              Crie seu próprio exercício com vídeo ou orientações personalizadas
            </p>
          </div>
        </button>

        {onSelectCombine && (
          <button
            type="button"
            onClick={onSelectCombine}
            className="w-full p-4 rounded-2xl border border-[var(--border-default)] hover:border-amber-500/50 bg-[var(--surface-subtle)] hover:bg-amber-500/5 transition-all text-left flex items-center gap-3.5 min-h-[64px] cursor-pointer"
          >
            <div className="w-12 h-12 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <ZapIcon className="w-6 h-6 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-bold text-[var(--text-primary)]">
                Criar combinação
              </h4>
              <p className="text-xs text-[var(--text-secondary)]">
                Bi-set, Tri-set, Circuito ou Super-série
              </p>
            </div>
          </button>
        )}
      </div>
    </BottomSheet>
  );
}

export function ExerciseActionsSheet({
  isOpen,
  item,
  itemIndex,
  totalItems,
  allCategories,
  categoryPublicId,
  inCombination = false,
  onClose,
  onOpenQuickEdit,
  onOpenExecutionModal,
  onOpenConfigureSequence,
  onDuplicate,
  onDelete,
  onMoveUp,
  onMoveDown,
  onMoveStart,
  onMoveEnd,
  onMoveToPosition,
  onMoveToCategory,
  onOpenConvertCustom,
  onCombineFromHere,
  onStartGuidedCombination,
}: {
  isOpen: boolean;
  item: WorkoutBlockItemDto;
  itemIndex: number;
  totalItems: number;
  allCategories?: { publicId: string; title: string }[];
  categoryPublicId: string;
  inCombination?: boolean;
  onClose: () => void;
  onOpenQuickEdit: () => void;
  onOpenExecutionModal: () => void;
  onOpenConfigureSequence?: () => void;
  onDuplicate: () => Promise<void>;
  onDelete: () => Promise<void>;
  onMoveUp: () => Promise<void>;
  onMoveDown: () => Promise<void>;
  onMoveStart?: () => Promise<void>;
  onMoveEnd?: () => Promise<void>;
  onMoveToPosition?: (targetPosition: number) => Promise<void>;
  onMoveToCategory: (targetCatId: string) => Promise<void>;
  onOpenConvertCustom: () => void;
  onCombineFromHere?: () => void;
  onStartGuidedCombination?: (type: WorkoutCombinationType) => void;
}) {
  const [isMovingCategory, setIsMovingCategory] = useState(false);
  const otherCategories = (allCategories || []).filter((c) => c.publicId !== categoryPublicId);

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="space-y-0.5">
          <div className="text-xs font-bold text-emerald-600 uppercase tracking-wide">
            O que deseja fazer?
          </div>
          <div className="text-sm sm:text-base font-extrabold text-[var(--text-primary)] truncate max-w-xs">
            {item.exerciseNameSnapshot}
          </div>
        </div>
      }
      footer={
        <button
          type="button"
          onClick={onClose}
          className="w-full py-3 px-4 rounded-2xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-secondary)] font-bold text-sm min-h-[48px] cursor-pointer"
        >
          Fechar
        </button>
      }
    >
      {isMovingCategory ? (
        <div className="space-y-2 pb-2">
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs font-bold text-[var(--text-secondary)]">
              Selecione o treino de destino:
            </span>
            <button
              type="button"
              onClick={() => setIsMovingCategory(false)}
              className="text-xs font-bold text-emerald-600 cursor-pointer"
            >
              Voltar
            </button>
          </div>
          {otherCategories.length === 0 ? (
            <p className="text-xs text-[var(--text-tertiary)] py-4 text-center">
              Não há outros treinos nesta ficha.
            </p>
          ) : (
            otherCategories.map((cat) => (
              <button
                key={cat.publicId}
                type="button"
                onClick={() => onMoveToCategory(cat.publicId)}
                className="w-full px-4 py-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)] hover:bg-emerald-500/10 text-left text-xs font-bold text-[var(--text-primary)] flex items-center justify-between min-h-[48px] cursor-pointer"
              >
                <span>{cat.title}</span>
                <span className="text-xs text-emerald-600">Mover →</span>
              </button>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-1 pb-2">
          <button
            type="button"
            onClick={onOpenQuickEdit}
            className="w-full px-4 py-3 rounded-xl hover:bg-[var(--surface-subtle)] flex items-center gap-3 text-left font-bold text-xs sm:text-sm text-[var(--text-primary)] min-h-[48px] cursor-pointer"
          >
            <Edit2 className="w-4 h-4 text-emerald-600" />
            <span>Editar exercício</span>
          </button>

          {(item.customVideoUrl || item.pinnedMedia) && (
            <button
              type="button"
              onClick={onOpenExecutionModal}
              className="w-full px-4 py-3 rounded-xl hover:bg-[var(--surface-subtle)] flex items-center gap-3 text-left font-bold text-xs sm:text-sm text-[var(--text-primary)] min-h-[48px] cursor-pointer"
            >
              <VideoIcon className="w-4 h-4 text-blue-600" />
              <span>Ver Execução / Vídeo</span>
            </button>
          )}

          {!inCombination && onStartGuidedCombination && (
            <div className="py-1 border-y border-[var(--border-subtle)] space-y-1 my-1">
              <div className="px-3 pt-1 text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
                Combinações Guiadas
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onStartGuidedCombination("BI_SET");
                }}
                className="w-full px-4 py-3 rounded-xl hover:bg-blue-500/10 flex items-center gap-3 text-left font-bold text-xs sm:text-sm text-blue-600 dark:text-blue-400 min-h-[48px] cursor-pointer"
              >
                <ZapIcon className="w-4 h-4 text-blue-500" />
                <span>Criar bi-set com este exercício</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onStartGuidedCombination("TRI_SET");
                }}
                className="w-full px-4 py-3 rounded-xl hover:bg-purple-500/10 flex items-center gap-3 text-left font-bold text-xs sm:text-sm text-purple-600 dark:text-purple-400 min-h-[48px] cursor-pointer"
              >
                <ZapIcon className="w-4 h-4 text-purple-500" />
                <span>Criar tri-set com este exercício</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onStartGuidedCombination("CIRCUIT");
                }}
                className="w-full px-4 py-3 rounded-xl hover:bg-amber-500/10 flex items-center gap-3 text-left font-bold text-xs sm:text-sm text-amber-600 dark:text-amber-400 min-h-[48px] cursor-pointer"
              >
                <ZapIcon className="w-4 h-4 text-amber-500" />
                <span>Criar circuito com este exercício</span>
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={onDuplicate}
            className="w-full px-4 py-3 rounded-xl hover:bg-[var(--surface-subtle)] flex items-center gap-3 text-left font-bold text-xs sm:text-sm text-[var(--text-primary)] min-h-[48px] cursor-pointer"
          >
            <Copy className="w-4 h-4 text-blue-500" />
            <span>Duplicar Exercício</span>
          </button>

          {!inCombination && onCombineFromHere && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onCombineFromHere();
              }}
              className="w-full px-4 py-3 rounded-xl hover:bg-emerald-500/10 flex items-center gap-3 text-left font-bold text-xs sm:text-sm text-emerald-600 dark:text-emerald-400 min-h-[48px] cursor-pointer"
            >
              <ZapIcon className="w-4 h-4 text-emerald-600" />
              <span>Combinar a partir daqui</span>
            </button>
          )}

          <button
            type="button"
            disabled={itemIndex === 0}
            onClick={onMoveUp}
            className="w-full px-4 py-3 rounded-xl hover:bg-[var(--surface-subtle)] flex items-center gap-3 text-left font-bold text-xs sm:text-sm text-[var(--text-primary)] min-h-[48px] disabled:opacity-40 cursor-pointer"
          >
            <ArrowUp className="w-4 h-4 text-amber-500" />
            <span>{inCombination ? "Mover para Cima no Bi-set" : "Mover para Cima"}</span>
          </button>

          <button
            type="button"
            disabled={itemIndex === totalItems - 1}
            onClick={onMoveDown}
            className="w-full px-4 py-3 rounded-xl hover:bg-[var(--surface-subtle)] flex items-center gap-3 text-left font-bold text-xs sm:text-sm text-[var(--text-primary)] min-h-[48px] disabled:opacity-40 cursor-pointer"
          >
            <ArrowDown className="w-4 h-4 text-amber-500" />
            <span>{inCombination ? "Mover para Baixo no Bi-set" : "Mover para Baixo"}</span>
          </button>

          {onMoveStart && !inCombination && (
            <button
              type="button"
              disabled={itemIndex === 0}
              onClick={onMoveStart}
              className="w-full px-4 py-3 rounded-xl hover:bg-[var(--surface-subtle)] flex items-center gap-3 text-left font-bold text-xs sm:text-sm text-[var(--text-primary)] min-h-[48px] disabled:opacity-40 cursor-pointer"
            >
              <ArrowUp className="w-4 h-4 text-emerald-500" />
              <span>Mover para o Início</span>
            </button>
          )}

          {onMoveEnd && !inCombination && (
            <button
              type="button"
              disabled={itemIndex === totalItems - 1}
              onClick={onMoveEnd}
              className="w-full px-4 py-3 rounded-xl hover:bg-[var(--surface-subtle)] flex items-center gap-3 text-left font-bold text-xs sm:text-sm text-[var(--text-primary)] min-h-[48px] disabled:opacity-40 cursor-pointer"
            >
              <ArrowDown className="w-4 h-4 text-emerald-500" />
              <span>Mover para o Final</span>
            </button>
          )}

          {onMoveToPosition && !inCombination && totalItems > 1 && (
            <div className="px-4 py-3 flex items-center justify-between gap-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
              <span className="text-xs font-bold text-[var(--text-secondary)]">Escolher posição:</span>
              <select
                value={itemIndex + 1}
                onChange={(e) => {
                  const targetIdx = Number(e.target.value) - 1;
                  onMoveToPosition(targetIdx);
                }}
                className="px-3 py-1.5 rounded-xl bg-[var(--surface)] border border-[var(--border-default)] text-xs font-bold text-[var(--text-primary)] cursor-pointer"
              >
                {Array.from({ length: totalItems }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {i + 1}º de {totalItems}
                  </option>
                ))}
              </select>
            </div>
          )}

          {!inCombination && otherCategories.length > 0 && (
            <button
              type="button"
              onClick={() => setIsMovingCategory(true)}
              className="w-full px-4 py-3 rounded-xl hover:bg-[var(--surface-subtle)] flex items-center gap-3 text-left font-bold text-xs sm:text-sm text-[var(--text-primary)] min-h-[48px] cursor-pointer"
            >
              <MoveIcon className="w-4 h-4 text-teal-600" />
              <span>Mover para Outro Treino</span>
            </button>
          )}

          {onOpenConfigureSequence && (
            <button
              type="button"
              onClick={onOpenConfigureSequence}
              className="w-full px-4 py-3 rounded-xl hover:bg-purple-500/10 flex items-center gap-3 text-left font-bold text-xs sm:text-sm text-purple-700 dark:text-purple-300 min-h-[48px] cursor-pointer"
            >
              <SparklesIcon className="w-4 h-4 text-purple-600" />
              <span>Configurar Sequência</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenConvertCustom}
            className="w-full px-4 py-3 rounded-xl hover:bg-[var(--surface-subtle)] flex items-center gap-3 text-left font-bold text-xs sm:text-sm text-violet-600 dark:text-violet-400 min-h-[48px] cursor-pointer"
          >
            <SparklesIcon className="w-4 h-4" />
            <span>Converter em Personalizado</span>
          </button>

          <div className="pt-1 border-t border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={() => {
                if (confirm(`Excluir "${item.exerciseNameSnapshot}"?`)) {
                  onDelete();
                }
              }}
              className="w-full px-4 py-3 rounded-xl hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center gap-3 text-left font-bold text-xs sm:text-sm min-h-[48px] cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Excluir Exercício</span>
            </button>
          </div>
        </div>
      )}
    </BottomSheet>
  );
}
