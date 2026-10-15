"use client";

import { useState, useMemo, useTransition, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import type {
  WorkoutRootDto,
  WorkoutVersionDto,
  WorkoutBlockItemDto,
  DifficultyLevel,
  WorkoutCombinationType,
  WorkoutItemCombinationDto,
} from "@/lib/training-v2/types";
import type {
  WorkoutVersionSummaryDto,
  QuickConfigInput,
} from "@/lib/training-v2/workout-repository";
import {
  updateWorkoutDraftMetadataAction,
  createCategoryAction,
  renameCategoryAction,
  duplicateCategoryAction,
  deleteCategoryAction,
  reorderCategoriesAction,
  addExerciseItemToBlockAction,
  duplicateExerciseAction,
  moveExerciseToCategoryAction,
  deleteExerciseAction,
  reorderExercisesAction,
  updateExerciseQuickConfigAction,
  createNewWorkoutVersionAction,
  duplicateWorkoutAction,
  saveWorkoutAsTemplateAction,
  createSubBlockAction,
  renameSubBlockAction,
  reorderSubBlocksAction,
  deleteSubBlockAction,
  duplicateSubBlockAction,
  resolveUnmatchedExerciseItemAction,
  deleteWorkoutAction,
  deleteWorkoutDraftAction,
  createItemCombinationAction,
  updateItemCombinationAction,
  ungroupItemCombinationAction,
  deleteItemCombinationAction,
  moveItemInCombinationAction,
  removeItemFromCombinationAction,
  duplicateItemCombinationAction,
  createCustomExerciseAction,
  convertUnresolvedToCustomExerciseAction,
} from "@/app/consultoria/[slug]/rotinas/actions";
import { WorkoutCategoryCard } from "./workout-category-card";
import { UnifiedExercisePicker } from "./unified-exercise-picker";
import {
  CustomExerciseInlineModal,
  type CustomExerciseFormData,
} from "./custom-exercise-inline-modal";
import { WorkoutPublishDialog } from "./workout-publish-dialog";
import { SequenceConfigurationModal } from "./sequence-configuration-modal";
import { WorkoutAssignModal } from "./workout-assign-modal";
import Link from "next/link";
import { TemplateAssignModal } from "./template-assign-modal";
import { StudentWorkoutRenderer } from "./student-workout-renderer";
import { StudioExerciseLibrarySidebar } from "./studio-exercise-library-sidebar";

function ArrowLeftIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  );
}

function AlertCircleIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" strokeLinecap="round" />
      <line x1="12" y1="16" x2="12.01" y2="16" strokeLinecap="round" />
    </svg>
  );
}

function SparklesIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  );
}

function DownloadIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function CheckIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function ClockIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function UserCheckIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <polyline points="16 11 18 13 22 9" />
    </svg>
  );
}

function EyeIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function SendIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

function CopyIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function BookmarkIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function PlusIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  );
}

function XIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function SlidersIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <line x1="4" y1="21" x2="4" y2="14" />
      <line x1="4" y1="10" x2="4" y2="3" />
      <line x1="12" y1="21" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12" y2="3" />
      <line x1="20" y1="21" x2="20" y2="16" />
      <line x1="20" y1="12" x2="20" y2="3" />
      <line x1="1" y1="14" x2="7" y2="14" />
      <line x1="9" y1="8" x2="15" y2="8" />
      <line x1="17" y1="16" x2="23" y2="16" />
    </svg>
  );
}

function TrashIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <polyline points="3 6 5 6 21 6" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

export type WorkoutBuilderProps = {
  consultancySlug: string;
  workout: WorkoutRootDto;
  initialVersion: WorkoutVersionDto;
  isDraft: boolean;
  allVersions: WorkoutVersionSummaryDto[];
  isConsultancyAdmin: boolean;
  initialStudentPublicId?: string;
};
const CATEGORY_PRESETS = [
  "Peito",
  "Costas",
  "Pernas",
  "Ombros",
  "Bíceps",
  "Tríceps",
  "Abdômen",
  "Cardio",
  "Aquecimento",
  "Mobilidade",
  "Treino A",
  "Treino B",
  "Superior",
  "Inferior",
  "Push",
  "Pull",
  "Finalização",
];

export function WorkoutBuilder({
  consultancySlug,
  workout,
  initialVersion,
  /* isDraft, allVersions and isConsultancyAdmin available in props */
  initialStudentPublicId,
}: WorkoutBuilderProps) {
  const router = useRouter();
  const [version, setVersion] = useState<WorkoutVersionDto>(initialVersion);
  const isDraft = version.status === "DRAFT";

  const [isPending, startTransition] = useTransition();
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Autosave State Engine
  type AutosaveStatus = "saved" | "saving" | "error";
  const [saveStatus, setSaveStatus] = useState<AutosaveStatus>("saved");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);
  const [isLibrarySidebarOpen, setIsLibrarySidebarOpen] = useState(true);

  // Metadata state
  const [isMetadataExpanded, setIsMetadataExpanded] = useState(false);
  const [title, setTitle] = useState(version.title || workout.title);
  const [objective, setObjective] = useState(version.objective || workout.objective || "");
  const [difficultyLevel, setDifficultyLevel] = useState<DifficultyLevel | string>(
    version.difficultyLevel || workout.difficultyLevel || "INTERMEDIATE"
  );
  const [estimatedDurationMinutes, setEstimatedDurationMinutes] = useState<number>(
    version.estimatedDurationMinutes || workout.estimatedDurationMinutes || 50
  );
  const [notes, setNotes] = useState(version.notes || "");

  // Autosave refs
  const pendingMetadataRef = useRef<{
    title: string;
    objective: string;
    difficultyLevel: DifficultyLevel | string;
    estimatedDurationMinutes: number;
    notes: string;
  } | null>(null);
  const metadataTimerRef = useRef<NodeJS.Timeout | null>(null);
  const revisionRef = useRef<number>(0);
  const retryLastSaveRef = useRef<(() => Promise<void>) | null>(null);
  const flushPendingMetadataRef = useRef<(() => Promise<void>) | null>(null);

  // Flush pending metadata directly to server
  const flushPendingMetadata = useCallback(async () => {
    if (!pendingMetadataRef.current || !isDraft) return;
    const payload = { ...pendingMetadataRef.current };
    pendingMetadataRef.current = null;
    if (metadataTimerRef.current) {
      clearTimeout(metadataTimerRef.current);
      metadataTimerRef.current = null;
    }

    const currentRev = ++revisionRef.current;
    setSaveStatus("saving");
    setSaveErrorMessage(null);

    try {
      const res = await updateWorkoutDraftMetadataAction(
        consultancySlug,
        version.publicId,
        {
          title: payload.title.trim() || workout.title,
          objective: payload.objective.trim() || null,
          difficultyLevel: payload.difficultyLevel as DifficultyLevel,
          estimatedDurationMinutes: Number(payload.estimatedDurationMinutes) || null,
          notes: payload.notes.trim() || null,
        }
      );
      if (res.ok && res.data) {
        if (revisionRef.current === currentRev) {
          setVersion((prev) => ({
            ...prev,
            title: res.data!.title,
            objective: res.data!.objective,
            difficultyLevel: res.data!.difficultyLevel,
            estimatedDurationMinutes: res.data!.estimatedDurationMinutes,
            notes: res.data!.notes,
            updatedAt: res.data!.updatedAt,
          }));
          setSaveStatus("saved");
          setLastSavedAt(new Date());
        }
      } else {
        if (revisionRef.current === currentRev) {
          setSaveStatus("error");
          setSaveErrorMessage(res.error || "Erro ao salvar alterações");
          retryLastSaveRef.current = () => flushPendingMetadataRef.current?.() || Promise.resolve();
        }
      }
    } catch (err: unknown) {
      if (revisionRef.current === currentRev) {
        const msg = err instanceof Error ? err.message : "Erro ao salvar alterações";
        setSaveStatus("error");
        setSaveErrorMessage(msg);
        retryLastSaveRef.current = () => flushPendingMetadataRef.current?.() || Promise.resolve();
      }
    }
  }, [consultancySlug, isDraft, version.publicId, workout.title]);

  useEffect(() => {
    flushPendingMetadataRef.current = flushPendingMetadata;
  }, [flushPendingMetadata]);

  // Schedule debounced metadata save (600ms)
  const scheduleMetadataSave = useCallback(
    (overrides: Partial<{
      title: string;
      objective: string;
      difficultyLevel: DifficultyLevel | string;
      estimatedDurationMinutes: number;
      notes: string;
    }>) => {
      if (!isDraft) return;
      const current = {
        title,
        objective,
        difficultyLevel,
        estimatedDurationMinutes,
        notes,
        ...overrides,
      };
      pendingMetadataRef.current = current;
      setSaveStatus("saving");
      setSaveErrorMessage(null);

      if (metadataTimerRef.current) {
        clearTimeout(metadataTimerRef.current);
      }
      metadataTimerRef.current = setTimeout(() => {
        flushPendingMetadata();
      }, 600);
    },
    [difficultyLevel, estimatedDurationMinutes, flushPendingMetadata, isDraft, notes, objective, title]
  );

  // Beforeunload & navigation flush protection
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (pendingMetadataRef.current) {
        flushPendingMetadata();
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      if (pendingMetadataRef.current) {
        flushPendingMetadata();
      }
    };
  }, [flushPendingMetadata]);

  // Unified runner for structural actions with Autosave guarantees
  async function runWithAutosave<T>(action: () => Promise<T>): Promise<T> {
    if (pendingMetadataRef.current) {
      await flushPendingMetadata();
    }
    setSaveStatus("saving");
    setSaveErrorMessage(null);
    try {
      const result = await action();
      setSaveStatus("saved");
      setLastSavedAt(new Date());
      return result;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao salvar alteração";
      setSaveStatus("error");
      setSaveErrorMessage(msg);
      retryLastSaveRef.current = async () => {
        await runWithAutosave(action);
      };
      throw err;
    }
  }

  // Category creation inline state
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  // Modals state
  const [activeCategoryForPicker, setActiveCategoryForPicker] = useState<string | null>(null);
  const [activeSubBlockForPicker, setActiveSubBlockForPicker] = useState<string | null>(null);
  const [resolvingItemPublicId, setResolvingItemPublicId] = useState<string | null>(null);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [configuringSequenceItem, setConfiguringSequenceItem] = useState<{
    item: WorkoutBlockItemDto;
    movements: import("@/lib/training-v2/sequence-detector").DetectedMovement[];
  } | null>(null);
  const [customModalTarget, setCustomModalTarget] = useState<{
    categoryPublicId: string;
    subBlockPublicId?: string;
    convertingItemPublicId?: string;
    initialData?: Partial<CustomExerciseFormData>;
  } | null>(null);
  const [isPublishDialogOpen, setIsPublishDialogOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);
  const [activeMobileCategoryIndex, setActiveMobileCategoryIndex] = useState<number>(0);
  const tabsContainerRef = useRef<HTMLDivElement | null>(null);

  const backHref = initialStudentPublicId
    ? `/consultoria/${consultancySlug}/progresso/alunos/${initialStudentPublicId}`
    : `/consultoria/${consultancySlug}/rotinas${workout.isTemplate ? "?tab=templates" : ""}`;

  // Keep active category tab centered smoothly on mobile without page overflow
  useEffect(() => {
    if (activeMobileCategoryIndex >= 0 && tabsContainerRef.current) {
      const activeEl = tabsContainerRef.current.querySelector<HTMLElement>(
        `[data-category-tab="${activeMobileCategoryIndex}"]`
      );
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
      }
    }
  }, [activeMobileCategoryIndex]);

  const categories = useMemo(() => version.blocks || [], [version.blocks]);
  const totalExercises = categories.reduce(
    (acc, cat) => acc + (cat.items ? cat.items.length : 0),
    0
  );

  const allCategoriesSimple = useMemo(
    () =>
      categories.map((cat, idx) => ({
        publicId: cat.publicId,
        title: cat.title || `Categoria ${idx + 1}`,
      })),
    [categories]
  );

  function notify(msg: string) {
    setFeedbackMessage(msg);
    setTimeout(() => setFeedbackMessage(null), 3500);
  }


  // Add Exercise directly to Category (used by Studio Sidebar and Quick Actions)
  async function handleAddExerciseToCategory(categoryPublicId: string, exercisePublicId: string) {
    return runWithAutosave(async () => {
      const res = await addExerciseItemToBlockAction(
        consultancySlug,
        categoryPublicId,
        exercisePublicId,
        undefined,
        undefined
      );
      if (res.ok && res.data) {
        const newItem = res.data;
        setVersion((prev) => ({
          ...prev,
          blocks: prev.blocks.map((b) =>
            b.publicId === categoryPublicId
              ? { ...b, items: [...(b.items || []), newItem] }
              : b
          ),
        }));
        notify(`Exercício "${newItem.exerciseNameSnapshot}" adicionado.`);
        return newItem;
      } else {
        notify(res.error || "Erro ao adicionar exercício.");
        throw new Error(res.error || "Erro ao adicionar exercício.");
      }
    });
  }

  // Create Category
  async function handleCreateCategory() {
    if (!newCategoryName.trim()) return;
    await runWithAutosave(async () => {
      const res = await createCategoryAction(
        consultancySlug,
        version.publicId,
        newCategoryName.trim()
      );
      if (res.ok && res.data) {
        setVersion((prev) => ({
          ...prev,
          blocks: [...(prev.blocks || []), res.data!],
        }));
        setNewCategoryName("");
        setIsCreatingCategory(false);
        notify(`Categoria "${res.data.title}" criada.`);
      } else {
        notify(res.error || "Erro ao criar categoria.");
        throw new Error(res.error || "Erro ao criar categoria.");
      }
    });
  }

  // Rename Category
  async function handleRenameCategory(categoryPublicId: string, newTitle: string) {
    await runWithAutosave(async () => {
      const res = await renameCategoryAction(consultancySlug, categoryPublicId, newTitle);
      if (res.ok && res.data) {
        setVersion((prev) => ({
          ...prev,
          blocks: prev.blocks.map((b) =>
            b.publicId === categoryPublicId ? { ...b, title: newTitle } : b
          ),
        }));
        notify("Categoria renomeada.");
      } else {
        notify(res.error || "Erro ao renomear categoria.");
        throw new Error(res.error || "Erro ao renomear categoria.");
      }
    });
  }

  // Duplicate Category
  async function handleDuplicateCategory(categoryPublicId: string) {
    await runWithAutosave(async () => {
      const res = await duplicateCategoryAction(consultancySlug, categoryPublicId);
      if (res.ok && res.data) {
        setVersion((prev) => ({
          ...prev,
          blocks: [...prev.blocks, res.data!],
        }));
        notify("Categoria duplicada com sucesso.");
      } else {
        notify(res.error || "Erro ao duplicar categoria.");
        throw new Error(res.error || "Erro ao duplicar categoria.");
      }
    });
  }

  // Delete Category
  async function handleDeleteCategory(categoryPublicId: string) {
    await runWithAutosave(async () => {
      const res = await deleteCategoryAction(consultancySlug, categoryPublicId);
      if (res.ok) {
        setVersion((prev) => ({
          ...prev,
          blocks: prev.blocks.filter((b) => b.publicId !== categoryPublicId),
        }));
        notify("Categoria removida.");
      } else {
        notify(res.error || "Erro ao remover categoria.");
        throw new Error(res.error || "Erro ao remover categoria.");
      }
    });
  }

  // Reorder Categories
  async function handleMoveCategory(categoryIndex: number, direction: "up" | "down") {
    const targetIdx = direction === "up" ? categoryIndex - 1 : categoryIndex + 1;
    if (targetIdx < 0 || targetIdx >= categories.length) return;

    const reordered = [...categories];
    const [moved] = reordered.splice(categoryIndex, 1);
    reordered.splice(targetIdx, 0, moved);

    setVersion((prev) => ({ ...prev, blocks: reordered }));

    await runWithAutosave(async () => {
      const ids = reordered.map((b) => b.publicId);
      const res = await reorderCategoriesAction(consultancySlug, version.publicId, ids);
      if (!res.ok) {
        setVersion((prev) => ({ ...prev, blocks: categories }));
        notify(res.error || "Erro ao reordenar categorias.");
        throw new Error(res.error || "Erro ao reordenar categorias.");
      }
    });
  }

  // Add Exercise from Picker (or resolve unmatched exercise)
  async function handleSelectExercise(exercisePublicId: string) {
    if (resolvingItemPublicId) {
      const itemToResolve = resolvingItemPublicId;
      setResolvingItemPublicId(null);
      setActiveCategoryForPicker(null);
      setActiveSubBlockForPicker(null);
      await runWithAutosave(async () => {
        const res = await resolveUnmatchedExerciseItemAction(
          consultancySlug,
          itemToResolve,
          exercisePublicId
        );
        if (res.ok && res.data) {
          const updatedItem = res.data;
          setVersion((prev) => ({
            ...prev,
            blocks: prev.blocks.map((b) => ({
              ...b,
              items: (b.items || []).map((i) =>
                i.publicId === itemToResolve ? updatedItem : i
              ),
            })),
          }));
          notify(`Exercício "${updatedItem.exerciseNameSnapshot}" vinculado com sucesso!`);
        } else {
          notify(res.error || "Erro ao vincular exercício da biblioteca.");
          throw new Error(res.error || "Erro ao vincular exercício da biblioteca.");
        }
      });
      return;
    }

    if (!activeCategoryForPicker) return;
    const catId = activeCategoryForPicker;
    const subBlockId = activeSubBlockForPicker;
    await runWithAutosave(async () => {
      const res = await addExerciseItemToBlockAction(
        consultancySlug,
        catId,
        exercisePublicId,
        undefined,
        subBlockId
      );
      if (res.ok && res.data) {
        const newItem = res.data;
        setVersion((prev) => ({
          ...prev,
          blocks: prev.blocks.map((b) =>
            b.publicId === catId
              ? { ...b, items: [...(b.items || []), newItem] }
              : b
          ),
        }));
        notify(`Exercício "${newItem.exerciseNameSnapshot}" adicionado.`);
      } else {
        notify(res.error || "Erro ao adicionar exercício.");
        throw new Error(res.error || "Erro ao adicionar exercício.");
      }
    });
  }

  function handleOpenCreateCustomExercise(
    categoryPublicId: string,
    subBlockPublicId?: string,
    convertingItemPublicId?: string,
    initialData?: { name?: string; muscleGroup?: string; equipment?: string }
  ) {
    setCustomModalTarget({
      categoryPublicId,
      subBlockPublicId,
      convertingItemPublicId,
      initialData: initialData
        ? {
            name: initialData.name || "",
            muscleGroup: initialData.muscleGroup || "",
            equipment: initialData.equipment || "",
          }
        : undefined,
    });
    setIsCustomModalOpen(true);
  }

  // Add or Convert Custom Exercise
  async function handleSaveCustomExercise(data: CustomExerciseFormData) {
    if (!customModalTarget) return;

    await runWithAutosave(async () => {
      if (customModalTarget.convertingItemPublicId) {
        const res = await convertUnresolvedToCustomExerciseAction(consultancySlug, {
          itemPublicId: customModalTarget.convertingItemPublicId,
          name: data.name,
          muscleGroupPrimary: data.muscleGroup,
          equipment: data.equipment,
          instructions: data.instructions,
          customVideoUrl: data.videoUrl,
          mediaAssetPublicId: data.videoKey,
          saveToLibrary: data.saveToMyLibrary,
          notes: data.notes,
          isSequence: data.isSequence || data.type === "SEQUENCE",
          sequenceMovements: data.sequenceMovements,
        });
        if (res.ok && res.data) {
          const converted = res.data;
          setVersion((prev) => ({
            ...prev,
            blocks: prev.blocks.map((b) => ({
              ...b,
              items: (b.items || []).map((i) =>
                i.publicId === customModalTarget.convertingItemPublicId ? converted : i
              ),
            })),
          }));
          notify(
            data.isSequence || data.type === "SEQUENCE"
              ? `Sequência "${data.name}" configurada com sucesso e liberada para publicação!`
              : `Exercício "${data.name}" personalizado com sucesso e liberado para publicação!`
          );
          setIsCustomModalOpen(false);
          setCustomModalTarget(null);
        } else {
          notify(res.error || "Erro ao personalizar exercício.");
          throw new Error(res.error || "Erro ao personalizar exercício.");
        }
        return;
      }

      const catId = customModalTarget.categoryPublicId;
      const sbId = customModalTarget.subBlockPublicId;
      const res = await createCustomExerciseAction(consultancySlug, catId, {
        name: data.name,
        muscleGroup: data.muscleGroup,
        equipment: data.equipment,
        instructions: data.instructions,
        subBlockPublicId: sbId,
        customVideoUrl: data.videoUrl,
        mediaAssetPublicId: data.videoKey,
        saveToLibrary: data.saveToMyLibrary,
        notes: data.notes,
        isSequence: data.isSequence || data.type === "SEQUENCE",
        sequenceMovements: data.sequenceMovements,
        sets: [
          {
            setType: "NORMAL",
            targetReps: 10,
            targetRestSeconds: data.restSeconds ?? 60,
          },
        ],
      });
      if (res.ok && res.data) {
        const newItem = res.data;
        setVersion((prev) => ({
          ...prev,
          blocks: prev.blocks.map((b) =>
            b.publicId === catId
              ? { ...b, items: [...(b.items || []), newItem] }
              : b
          ),
        }));
        notify(`Exercício personalizado "${newItem.exerciseNameSnapshot}" criado com sucesso.`);
        setIsCustomModalOpen(false);
        setCustomModalTarget(null);
      } else {
        notify(res.error || "Erro ao criar exercício.");
        throw new Error(res.error || "Erro ao criar exercício.");
      }
    });
  }

  // Duplicate Exercise
  async function handleDuplicateExercise(itemPublicId: string) {
    await runWithAutosave(async () => {
      const res = await duplicateExerciseAction(consultancySlug, itemPublicId);
      if (res.ok && res.data) {
        const duplicated = res.data;
        setVersion((prev) => ({
          ...prev,
          blocks: prev.blocks.map((b) => {
            const hasItem = b.items?.some((i) => i.publicId === itemPublicId);
            if (!hasItem) return b;
            return {
              ...b,
              items: [...(b.items || []), duplicated],
            };
          }),
        }));
        notify("Exercício duplicado.");
      } else {
        notify(res.error || "Erro ao duplicar exercício.");
        throw new Error(res.error || "Erro ao duplicar exercício.");
      }
    });
  }

  // Move Exercise to Category
  async function handleMoveExerciseToCategory(
    itemPublicId: string,
    targetCategoryPublicId: string
  ) {
    await runWithAutosave(async () => {
      const res = await moveExerciseToCategoryAction(
        consultancySlug,
        itemPublicId,
        targetCategoryPublicId
      );
      if (res.ok) {
        // Find item
        let movedItem: WorkoutBlockItemDto | null = null;
        version.blocks.forEach((b) => {
          const found = b.items?.find((i) => i.publicId === itemPublicId);
          if (found) movedItem = found;
        });

        if (movedItem) {
          const itemToMove: WorkoutBlockItemDto = movedItem;
          setVersion((prev) => ({
            ...prev,
            blocks: prev.blocks.map((b) => {
              if (b.publicId === targetCategoryPublicId) {
                return { ...b, items: [...(b.items || []), itemToMove] };
              }
              return {
                ...b,
                items: b.items ? b.items.filter((i) => i.publicId !== itemPublicId) : [],
              };
            }),
          }));
        }
        notify("Exercício movido para a nova categoria.");
      } else {
        notify(res.error || "Erro ao mover exercício.");
        throw new Error(res.error || "Erro ao mover exercício.");
      }
    });
  }

  // Delete Exercise
  async function handleDeleteExercise(itemPublicId: string) {
    await runWithAutosave(async () => {
      const res = await deleteExerciseAction(consultancySlug, itemPublicId);
      if (res.ok) {
        setVersion((prev) => ({
          ...prev,
          blocks: prev.blocks.map((b) => ({
            ...b,
            items: b.items ? b.items.filter((i) => i.publicId !== itemPublicId) : [],
          })),
        }));
        notify("Exercício removido.");
      } else {
        notify(res.error || "Erro ao remover exercício.");
        throw new Error(res.error || "Erro ao remover exercício.");
      }
    });
  }

  // Reorder Exercises in Category
  async function handleMoveExercise(
    categoryPublicId: string,
    itemIndex: number,
    direction: "up" | "down"
  ) {
    const cat = categories.find((b) => b.publicId === categoryPublicId);
    if (!cat || !cat.items) return;

    const targetIdx = direction === "up" ? itemIndex - 1 : itemIndex + 1;
    if (targetIdx < 0 || targetIdx >= cat.items.length) return;

    const reordered = [...cat.items];
    const [moved] = reordered.splice(itemIndex, 1);
    reordered.splice(targetIdx, 0, moved);

    setVersion((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b) =>
        b.publicId === categoryPublicId ? { ...b, items: reordered } : b
      ),
    }));

    await runWithAutosave(async () => {
      const ids = reordered.map((i) => i.publicId);
      const res = await reorderExercisesAction(consultancySlug, categoryPublicId, ids);
      if (!res.ok) {
        notify(res.error || "Erro ao reordenar exercícios.");
        throw new Error(res.error || "Erro ao reordenar exercícios.");
      }
    });
  }

  // Reorder all exercises in a category (supports moving combination blocks and standalone exercises as units)
  async function handleReorderExercises(categoryPublicId: string, itemPublicIds: string[]) {
    setVersion((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b) => {
        if (b.publicId !== categoryPublicId) return b;
        const itemMap = new Map((b.items || []).map((it) => [it.publicId, it]));
        const newItems = itemPublicIds
          .map((id, idx) => {
            const it = itemMap.get(id);
            return it ? { ...it, sortOrder: idx } : null;
          })
          .filter(Boolean) as WorkoutBlockItemDto[];

        const newCombs = (b.combinations || []).map((c) => {
          const combItems = newItems
            .filter((i) => i.combinationPublicId === c.publicId)
            .sort((a, b) => a.sortOrder - b.sortOrder);
          const minOrder =
            combItems.length > 0 ? Math.min(...combItems.map((i) => i.sortOrder)) : c.sortOrder;
          return { ...c, sortOrder: minOrder, items: combItems };
        });

        const newSubBlocks = (b.subBlocks || []).map((sb) => ({
          ...sb,
          items: newItems.filter((i) => i.subBlockPublicId === sb.publicId),
          combinations: newCombs.filter((c) => c.subBlockPublicId === sb.publicId),
        }));

        return {
          ...b,
          items: newItems,
          combinations: newCombs,
          subBlocks: newSubBlocks,
        };
      }),
    }));

    await runWithAutosave(async () => {
      const res = await reorderExercisesAction(consultancySlug, categoryPublicId, itemPublicIds);
      if (!res.ok) {
        notify(res.error || "Erro ao reordenar exercícios.");
        throw new Error(res.error || "Erro ao reordenar exercícios.");
      }
    });
  }

  // Update Exercise Quick Config
  async function handleUpdateExerciseQuickConfig(
    itemPublicId: string,
    config: QuickConfigInput
  ) {
    await runWithAutosave(async () => {
      const res = await updateExerciseQuickConfigAction(consultancySlug, itemPublicId, config);
      if (res.ok && res.data) {
        setVersion((prev) => ({
          ...prev,
          blocks: prev.blocks.map((b) => ({
            ...b,
            items: b.items
              ? b.items.map((i) =>
                  i.publicId === itemPublicId
                    ? {
                        ...i,
                        sets: res.data!,
                        notes: config.notes ?? i.notes,
                        customVideoUrl:
                          config.customVideoUrl !== undefined
                            ? config.customVideoUrl
                            : i.customVideoUrl,
                      }
                    : i
                )
              : [],
          })),
        }));
      } else {
        notify(res.error || "Erro ao configurar exercício.");
        throw new Error(res.error || "Erro ao configurar exercício.");
      }
    });
  }

  // Duplicate Ficha
  async function handleDuplicateFicha() {
    startTransition(async () => {
      const res = await duplicateWorkoutAction(consultancySlug, workout.publicId, version.publicId);
      if (res.ok && res.data) {
        notify("Ficha duplicada!");
        router.push(`/consultoria/${consultancySlug}/rotinas/${res.data.workoutPublicId}`);
      } else {
        notify(res.error || "Erro ao duplicar ficha.");
      }
    });
  }

  // Save as Model (Template)
  async function handleSaveAsModel() {
    startTransition(async () => {
      const res = await saveWorkoutAsTemplateAction(consultancySlug, workout.publicId, version.publicId);
      if (res.ok && res.data) {
        notify("Ficha salva como Modelo com sucesso!");
      } else {
        notify(res.error || "Erro ao salvar modelo.");
      }
    });
  }

  // Create new draft version if already published
  async function handleCreateNewVersion() {
    startTransition(async () => {
      const res = await createNewWorkoutVersionAction(consultancySlug, workout.publicId);
      if (res.ok && res.data) {
        setVersion(res.data);
        notify("Novo rascunho de versão criado!");
        router.push(
          `/consultoria/${consultancySlug}/rotinas/${workout.publicId}?version=${res.data.publicId}`
        );
      } else {
        notify(res.error || "Erro ao criar nova versão.");
      }
    });
  }

  // Create Sub-Block (Grupo)
  async function handleCreateSubBlock(categoryPublicId: string, title: string) {
    await runWithAutosave(async () => {
      const res = await createSubBlockAction(consultancySlug, categoryPublicId, title);
      if (res.ok && res.data) {
        const newSubBlock = res.data;
        setVersion((prev) => ({
          ...prev,
          blocks: prev.blocks.map((b) =>
            b.publicId === categoryPublicId
              ? { ...b, subBlocks: [...(b.subBlocks || []), newSubBlock] }
              : b
          ),
        }));
        notify(`Grupo "${title}" criado.`);
      } else {
        notify(res.error || "Erro ao criar grupo.");
        throw new Error(res.error || "Erro ao criar grupo.");
      }
    });
  }

  // Rename Sub-Block (Grupo)
  async function handleRenameSubBlock(subBlockPublicId: string, newTitle: string) {
    await runWithAutosave(async () => {
      const res = await renameSubBlockAction(consultancySlug, subBlockPublicId, newTitle);
      if (res.ok && res.data) {
        setVersion((prev) => ({
          ...prev,
          blocks: prev.blocks.map((b) => ({
            ...b,
            subBlocks: (b.subBlocks || []).map((sb) =>
              sb.publicId === subBlockPublicId ? { ...sb, title: newTitle } : sb
            ),
          })),
        }));
        notify("Grupo renomeado.");
      } else {
        notify(res.error || "Erro ao renomear grupo.");
        throw new Error(res.error || "Erro ao renomear grupo.");
      }
    });
  }

  // Duplicate Sub-Block (Grupo)
  async function handleDuplicateSubBlock(subBlockPublicId: string) {
    await runWithAutosave(async () => {
      const res = await duplicateSubBlockAction(consultancySlug, subBlockPublicId);
      if (res.ok && res.data) {
        router.refresh();
        notify("Grupo duplicado com sucesso.");
      } else {
        notify(res.error || "Erro ao duplicar grupo.");
        throw new Error(res.error || "Erro ao duplicar grupo.");
      }
    });
  }

  // Delete Sub-Block (Grupo)
  async function handleDeleteSubBlock(subBlockPublicId: string) {
    await runWithAutosave(async () => {
      const res = await deleteSubBlockAction(consultancySlug, subBlockPublicId);
      if (res.ok) {
        setVersion((prev) => ({
          ...prev,
          blocks: prev.blocks.map((b) => ({
            ...b,
            subBlocks: (b.subBlocks || []).filter((sb) => sb.publicId !== subBlockPublicId),
            items: (b.items || []).filter((i) => i.subBlockPublicId !== subBlockPublicId),
          })),
        }));
        notify("Grupo excluído.");
      } else {
        notify(res.error || "Erro ao excluir grupo.");
        throw new Error(res.error || "Erro ao excluir grupo.");
      }
    });
  }

  // Move Sub-Block (Grupo) Up/Down
  async function handleMoveSubBlock(
    categoryPublicId: string,
    subBlockIndex: number,
    direction: "up" | "down"
  ) {
    const cat = categories.find((b) => b.publicId === categoryPublicId);
    if (!cat || !cat.subBlocks) return;

    const targetIdx = direction === "up" ? subBlockIndex - 1 : subBlockIndex + 1;
    if (targetIdx < 0 || targetIdx >= cat.subBlocks.length) return;

    const reordered = [...cat.subBlocks];
    const [moved] = reordered.splice(subBlockIndex, 1);
    reordered.splice(targetIdx, 0, moved);

    setVersion((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b) =>
        b.publicId === categoryPublicId ? { ...b, subBlocks: reordered } : b
      ),
    }));

    await runWithAutosave(async () => {
      const ids = reordered.map((sb) => sb.publicId);
      const res = await reorderSubBlocksAction(consultancySlug, categoryPublicId, ids);
      if (!res.ok) {
        notify(res.error || "Erro ao reordenar grupos.");
        throw new Error(res.error || "Erro ao reordenar grupos.");
      }
    });
  }

  // Delete Workout or Draft
  async function handleConfirmDelete() {
    startTransition(async () => {
      if (isDraft) {
        const res = await deleteWorkoutDraftAction(consultancySlug, version.publicId);
        if (res.ok) {
          notify("Rascunho excluído com sucesso.");
          router.push(`/consultoria/${consultancySlug}/rotinas`);
        } else {
          notify(res.error || "Erro ao excluir rascunho.");
        }
      } else {
        const res = await deleteWorkoutAction(consultancySlug, workout.publicId);
        if (res.ok) {
          notify("Treino excluído com sucesso.");
          router.push(`/consultoria/${consultancySlug}/rotinas`);
        } else {
          notify(res.error || "Erro ao excluir treino.");
        }
      }
    });
  }

  // Combinations (Bi-Set, Tri-Set, etc.)
  async function handleCreateCombination(input: {
    blockPublicId: string;
    subBlockPublicId?: string;
    combinationType: WorkoutCombinationType;
    title?: string;
    restAfterSeconds?: number;
    itemPublicIds: string[];
  }) {
    if (!isDraft) {
      notify("Crie um novo rascunho antes de adicionar combinações.");
      return;
    }
    await runWithAutosave(async () => {
      const res = await createItemCombinationAction(consultancySlug, input);
      if (res.ok && res.data) {
        const newComb = res.data;
        setVersion((prev) => ({
          ...prev,
          blocks: prev.blocks.map((b) => {
            if (b.publicId !== input.blockPublicId) return b;
            const selectedItems = (b.items || []).filter((it) => input.itemPublicIds.includes(it.publicId));
            const minSortOrder = selectedItems.length > 0
              ? Math.min(...selectedItems.map((it) => it.sortOrder))
              : 0;

            const updatedItems = (b.items || []).map((it) => {
              const selIdx = input.itemPublicIds.indexOf(it.publicId);
              if (selIdx !== -1) {
                return {
                  ...it,
                  combinationPublicId: newComb.publicId,
                  combinationType: newComb.combinationType,
                  subBlockPublicId: newComb.subBlockPublicId ?? it.subBlockPublicId,
                  sortOrder: minSortOrder + selIdx,
                };
              }
              return it;
            });
            const combItems = updatedItems
              .filter((it) => input.itemPublicIds.includes(it.publicId))
              .sort((a, b) => a.sortOrder - b.sortOrder);
            const fullNewComb: WorkoutItemCombinationDto = {
              ...newComb,
              items: combItems,
            };
            const updatedCombs = [
              ...(b.combinations || []).filter((c) => c.publicId !== newComb.publicId),
              fullNewComb,
            ];
            const updatedSubBlocks = (b.subBlocks || []).map((sb) => ({
              ...sb,
              items: updatedItems.filter((it) => it.subBlockPublicId === sb.publicId),
              combinations: updatedCombs.filter((c) => c.subBlockPublicId === sb.publicId),
            }));

            return {
              ...b,
              items: updatedItems,
              combinations: updatedCombs,
              subBlocks: updatedSubBlocks,
            };
          }),
        }));
        notify("Combinação criada com sucesso!");
      } else {
        notify(res.error || "Erro ao criar combinação.");
        throw new Error(res.error || "Erro ao criar combinação.");
      }
    });
  }

  async function handleUpdateCombination(
    combinationPublicId: string,
    input: {
      combinationType?: WorkoutCombinationType;
      title?: string;
      restAfterSeconds?: number;
    }
  ) {
    await runWithAutosave(async () => {
      const res = await updateItemCombinationAction(consultancySlug, combinationPublicId, input);
      if (res.ok && res.data) {
        const updatedComb = res.data;
        setVersion((prev) => ({
          ...prev,
          blocks: prev.blocks.map((b) => ({
            ...b,
            combinations: (b.combinations || []).map((c) =>
              c.publicId === combinationPublicId ? { ...c, ...updatedComb } : c
            ),
            items: (b.items || []).map((it) =>
              it.combinationPublicId === combinationPublicId
                ? {
                    ...it,
                    combinationType: updatedComb.combinationType || it.combinationType,
                  }
                : it
            ),
          })),
        }));
      } else {
        notify(res.error || "Erro ao atualizar combinação.");
        throw new Error(res.error || "Erro ao atualizar combinação.");
      }
    });
  }

  async function handleUngroupCombination(combinationPublicId: string) {
    await runWithAutosave(async () => {
      const res = await ungroupItemCombinationAction(consultancySlug, combinationPublicId);
      if (res.ok) {
        setVersion((prev) => ({
          ...prev,
          blocks: prev.blocks.map((b) => {
            const updatedItems = (b.items || []).map((it) =>
              it.combinationPublicId === combinationPublicId
                ? { ...it, combinationPublicId: null, combinationType: null }
                : it
            );
            const updatedCombs = (b.combinations || []).filter((c) => c.publicId !== combinationPublicId);
            const updatedSubBlocks = (b.subBlocks || []).map((sb) => ({
              ...sb,
              items: updatedItems.filter((it) => it.subBlockPublicId === sb.publicId),
              combinations: updatedCombs.filter((c) => c.subBlockPublicId === sb.publicId),
            }));
            return {
              ...b,
              items: updatedItems,
              combinations: updatedCombs,
              subBlocks: updatedSubBlocks,
            };
          }),
        }));
        notify("Combinação desfeita. Todos os exercícios foram preservados.");
      } else {
        notify(res.error || "Erro ao desfazer combinação.");
        throw new Error(res.error || "Erro ao desfazer combinação.");
      }
    });
  }

  async function handleDeleteCombination(combinationPublicId: string, deleteItems?: boolean) {
    await runWithAutosave(async () => {
      const res = await deleteItemCombinationAction(consultancySlug, combinationPublicId, deleteItems);
      if (res.ok) {
        setVersion((prev) => ({
          ...prev,
          blocks: prev.blocks.map((b) => ({
            ...b,
            combinations: (b.combinations || []).filter((c) => c.publicId !== combinationPublicId),
            items: deleteItems
              ? (b.items || []).filter((it) => it.combinationPublicId !== combinationPublicId)
              : (b.items || []).map((it) =>
                  it.combinationPublicId === combinationPublicId
                    ? { ...it, combinationPublicId: null, combinationType: null }
                    : it
                ),
          })),
        }));
        notify("Combinação excluída.");
      } else {
        notify(res.error || "Erro ao excluir combinação.");
        throw new Error(res.error || "Erro ao excluir combinação.");
      }
    });
  }

  async function handleDuplicateCombination(combinationPublicId: string) {
    await runWithAutosave(async () => {
      const res = await duplicateItemCombinationAction(consultancySlug, combinationPublicId);
      if (res.ok && res.data) {
        router.refresh();
        notify("Combinação duplicada com sucesso.");
      } else {
        notify(res.error || "Erro ao duplicar combinação.");
        throw new Error(res.error || "Erro ao duplicar combinação.");
      }
    });
  }

  async function handleMoveItemInCombination(
    combinationPublicId: string,
    itemPublicId: string,
    direction: "up" | "down"
  ) {
    // Optimistic swap with pre-sorted items and distinct order assignment
    setVersion((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b) => {
        const comb = (b.combinations || []).find((c) => c.publicId === combinationPublicId);
        if (!comb) return b;
        const combItems = (b.items || [])
          .filter((it) => it.combinationPublicId === combinationPublicId)
          .sort((a, b) => a.sortOrder - b.sortOrder);
        const idx = combItems.findIndex((it) => it.publicId === itemPublicId);
        if (idx === -1) return b;
        const targetIdx = direction === "up" ? idx - 1 : idx + 1;
        if (targetIdx < 0 || targetIdx >= combItems.length) return b;

        const reorderedCombItems = [...combItems];
        const [moved] = reorderedCombItems.splice(idx, 1);
        reorderedCombItems.splice(targetIdx, 0, moved);

        const currentOrders = combItems.map((it) => it.sortOrder).sort((a, b) => a - b);
        const hasDuplicates = currentOrders.some((val, i) => i > 0 && val === currentOrders[i - 1]);
        const ordersToAssign = hasDuplicates
          ? reorderedCombItems.map((_, i) => currentOrders[0] + i)
          : currentOrders;

        const finalCombItems = reorderedCombItems.map((it, i) => ({
          ...it,
          sortOrder: ordersToAssign[i],
        }));

        const orderMap = new Map(finalCombItems.map((it) => [it.publicId, it.sortOrder]));
        const updatedItems = (b.items || []).map((it) =>
          orderMap.has(it.publicId) ? { ...it, sortOrder: orderMap.get(it.publicId)! } : it
        );

        const updatedCombs = (b.combinations || []).map((c) =>
          c.publicId === combinationPublicId
            ? {
                ...c,
                sortOrder: Math.min(...finalCombItems.map((it) => it.sortOrder)),
                items: finalCombItems,
              }
            : c
        );
        return {
          ...b,
          items: updatedItems,
          combinations: updatedCombs,
        };
      }),
    }));

    await runWithAutosave(async () => {
      const res = await moveItemInCombinationAction(
        consultancySlug,
        combinationPublicId,
        itemPublicId,
        direction
      );
      if (!res.ok) {
        notify(res.error || "Erro ao mover exercício na combinação.");
        throw new Error(res.error || "Erro ao mover exercício na combinação.");
      }
    });
  }

  async function handleRemoveItemFromCombination(
    combinationPublicId: string,
    itemPublicId: string
  ) {
    await runWithAutosave(async () => {
      const res = await removeItemFromCombinationAction(
        consultancySlug,
        combinationPublicId,
        itemPublicId
      );
      if (res.ok) {
        setVersion((prev) => ({
          ...prev,
          blocks: prev.blocks.map((b) => {
            const remainingItems = (b.items || []).filter(
              (it) => it.combinationPublicId === combinationPublicId && it.publicId !== itemPublicId
            );
            const shouldAutoUngroup = remainingItems.length <= 1;

            return {
              ...b,
              items: (b.items || []).map((it) => {
                if (it.publicId === itemPublicId) {
                  return { ...it, combinationPublicId: null, combinationType: null };
                }
                if (shouldAutoUngroup && it.combinationPublicId === combinationPublicId) {
                  return { ...it, combinationPublicId: null, combinationType: null };
                }
                return it;
              }),
              combinations: shouldAutoUngroup
                ? (b.combinations || []).filter((c) => c.publicId !== combinationPublicId)
                : (b.combinations || []).map((c) =>
                    c.publicId === combinationPublicId
                      ? { ...c, items: (c.items || []).filter((it) => it.publicId !== itemPublicId) }
                      : c
                  ),
            };
          }),
        }));
        notify("Exercício desvinculado da combinação.");
      } else {
        notify(res.error || "Erro ao desvincular exercício.");
        throw new Error(res.error || "Erro ao desvincular exercício.");
      }
    });
  }

  // Guard for Publishing - opens interactive publish dialog
  function handleOpenPublishDialog() {
    if (version.status !== "DRAFT") {
      notify("Apenas versões em rascunho podem ser publicadas.");
      return;
    }
    setIsPublishDialogOpen(true);
  }

  return (
    <div className="w-full max-w-full min-w-0 space-y-6 overflow-x-hidden">
      {/* Toast Feedback Notification */}
      {feedbackMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl bg-[var(--surface)] border border-emerald-500 shadow-xl text-xs sm:text-sm font-bold text-[var(--text-primary)] flex items-center gap-2.5 animate-in slide-in-from-bottom-3 duration-200">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>{feedbackMessage}</span>
        </div>
      )}

      {/* Top Header — Mobile Compact 3-Line & Desktop Full Prescription Tool Bar */}
      <div className="w-full max-w-full min-w-0 pb-5 sm:pb-6 border-b border-[var(--border-subtle)] space-y-4">
        {/* Mobile Header (<sm): Compact 3-line layout requested by owner */}
        <div data-testid="compact-mobile-header" className="sm:hidden space-y-2.5 w-full max-w-full min-w-0">
          {/* Mobile Line 1: Voltar · Estado de salvamento · Mais opções */}
          <div className="flex items-center justify-between gap-2 w-full min-w-0">
            <Link
              href={backHref}
              aria-label="Voltar para rotinas"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] min-h-[44px] shrink-0"
            >
              <ArrowLeftIcon className="w-4 h-4" />
              <span>Voltar</span>
            </Link>

            {/* Live Autosave Indicator */}
            {isDraft ? (
              <div
                data-testid="builder-autosave-indicator"
                className="inline-flex items-center justify-center min-w-[110px] h-7 px-1 text-center shrink-0"
              >
                {saveStatus === "saving" && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25 whitespace-nowrap">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    <span>Salvando…</span>
                  </span>
                )}
                {saveStatus === "saved" && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 whitespace-nowrap">
                    <CheckIcon className="w-3 h-3 text-emerald-500" />
                    <span>Salvo{lastSavedAt ? ` às ${lastSavedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : ""}</span>
                  </span>
                )}
                {saveStatus === "error" && (
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/25 whitespace-nowrap"
                    title={saveErrorMessage || "Erro ao salvar alterações no servidor"}
                  >
                    <AlertCircleIcon className="w-3 h-3 text-rose-500" />
                    <span>Erro ao salvar</span>
                    <button
                      type="button"
                      onClick={() => retryLastSaveRef.current?.()}
                      className="underline ml-0.5 font-bold hover:text-rose-700 cursor-pointer"
                    >
                      Tentar
                    </button>
                  </span>
                )}
              </div>
            ) : (
              <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">
                Versão Oficial
              </span>
            )}

            {/* Mais opções button */}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setIsHeaderMenuOpen(!isHeaderMenuOpen)}
                aria-label="Mais opções do treino"
                className="w-11 h-11 min-h-[44px] min-w-[44px] rounded-xl text-xs font-bold bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)] flex items-center justify-center cursor-pointer transition-colors"
                title="Mais opções do treino"
              >
                <span className="font-extrabold tracking-widest leading-none">•••</span>
              </button>
              {isHeaderMenuOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setIsHeaderMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-1.5 w-52 rounded-xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xl z-40 py-1.5 text-xs font-semibold text-[var(--text-primary)] divide-y divide-[var(--border-subtle)] animate-in fade-in zoom-in-95 duration-100">
                    <div className="p-1 space-y-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          setIsHeaderMenuOpen(false);
                          setIsMetadataExpanded(!isMetadataExpanded);
                        }}
                        className="w-full px-3 py-2.5 rounded-xl hover:bg-[var(--surface-subtle)] flex items-center gap-2 text-left cursor-pointer min-h-[40px]"
                      >
                        <SlidersIcon className="w-3.5 h-3.5 text-emerald-500" />
                        <span>{isMetadataExpanded ? "Ocultar dados da ficha" : "Dados da ficha"}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsHeaderMenuOpen(false);
                          setIsPreviewOpen(true);
                        }}
                        className="w-full px-3 py-2.5 rounded-xl hover:bg-[var(--surface-subtle)] flex items-center gap-2 text-left cursor-pointer min-h-[40px]"
                      >
                        <EyeIcon className="w-3.5 h-3.5 text-teal-500" />
                        <span>Pré-visualizar como aluno</span>
                      </button>
                      <a
                        href={`/api/consultancies/${consultancySlug}/treinos/${workout.publicId}/pdf`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setIsHeaderMenuOpen(false)}
                        className="w-full px-3 py-2.5 rounded-xl hover:bg-[var(--surface-subtle)] flex items-center gap-2 text-left cursor-pointer min-h-[40px]"
                      >
                        <DownloadIcon className="w-3.5 h-3.5 text-[var(--brand)]" />
                        <span>Baixar PDF</span>
                      </a>
                    </div>
                    <div className="p-1 space-y-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          setIsHeaderMenuOpen(false);
                          handleDuplicateFicha();
                        }}
                        className="w-full px-3 py-2.5 rounded-xl hover:bg-[var(--surface-subtle)] flex items-center gap-2 text-left cursor-pointer min-h-[40px]"
                      >
                        <CopyIcon className="w-3.5 h-3.5 text-blue-500" />
                        <span>Duplicar treino</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsHeaderMenuOpen(false);
                          handleSaveAsModel();
                        }}
                        className="w-full px-3 py-2.5 rounded-xl hover:bg-[var(--surface-subtle)] flex items-center gap-2 text-left cursor-pointer min-h-[40px]"
                      >
                        <BookmarkIcon className="w-3.5 h-3.5 text-amber-500" />
                        <span>Salvar como modelo</span>
                      </button>
                    </div>
                    <div className="p-1">
                      <button
                        type="button"
                        onClick={() => {
                          setIsHeaderMenuOpen(false);
                          setIsDeleteDialogOpen(true);
                        }}
                        className="w-full px-3 py-2.5 rounded-xl hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center gap-2 text-left cursor-pointer min-h-[40px]"
                      >
                        <TrashIcon className="w-3.5 h-3.5" />
                        <span>{isDraft ? "Excluir rascunho" : "Excluir treino"}</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Mobile Line 2: Status do treino · Nome do treino */}
          <div className="flex items-center gap-2 w-full min-w-0">
            <span
              data-testid="builder-status-badge"
              className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full shrink-0 ${
                isDraft
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                  : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
              }`}
            >
              {isDraft
                ? `Rascunho V${version.versionNumber}`
                : `Publicado V${version.versionNumber}`}
            </span>
            {workout.isTemplate && (
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-[var(--surface-subtle)] text-[var(--text-secondary)] border border-[var(--border-subtle)] shrink-0">
                Modelo
              </span>
            )}
            {isDraft ? (
              <input
                type="text"
                value={title}
                onChange={(e) => {
                  const val = e.target.value;
                  setTitle(val);
                  scheduleMetadataSave({ title: val });
                }}
                onBlur={flushPendingMetadata}
                placeholder="Nome da ficha de treino"
                className="text-lg font-black text-[var(--text-primary)] tracking-tight bg-transparent border-b border-transparent hover:border-[var(--border-default)] focus:border-emerald-500 focus:outline-none transition-all py-0.5 flex-1 min-w-0"
                title="Clique para editar o nome da ficha (salvamento automático)"
              />
            ) : (
              <h1 className="text-lg font-black text-[var(--text-primary)] tracking-tight truncate flex-1 min-w-0">
                {title}
              </h1>
            )}
          </div>

          {/* Mobile Line 3: Objetivo, nível e duração, quando disponíveis */}
          <div data-testid="mobile-header-meta" className="flex items-center gap-2 text-xs text-[var(--text-secondary)] font-medium flex-wrap">
            {objective && <span className="truncate max-w-[140px]">{objective}</span>}
            {objective && <span className="opacity-40">•</span>}
            <span>
              {difficultyLevel === "BEGINNER"
                ? "Iniciante"
                : difficultyLevel === "ADVANCED"
                ? "Avançado"
                : "Intermediário"}
            </span>
            <span className="opacity-40">•</span>
            <span className="flex items-center gap-1">
              <ClockIcon className="w-3.5 h-3.5" />
              ~{estimatedDurationMinutes} min
            </span>
          </div>

          {/* Mobile Action: Publicar treino, somente quando permitido */}
          <div data-testid="mobile-builder-header" className="w-full pt-1">
            {isDraft && (
              <button
                type="button"
                data-testid="publish-workout-button"
                onClick={handleOpenPublishDialog}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-xs min-h-[44px] flex items-center justify-center gap-1.5 cursor-pointer text-center"
              >
                <SendIcon className="w-4 h-4" />
                <span>Publicar treino</span>
              </button>
            )}

            {!isDraft && (
              <div className="flex items-center gap-2 w-full">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(true)}
                  className="flex-1 py-2.5 px-3 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-xs min-h-[44px] flex items-center justify-center gap-1.5 cursor-pointer text-center"
                >
                  <UserCheckIcon className="w-4 h-4" />
                  <span>Atribuir ao aluno</span>
                </button>
                <button
                  type="button"
                  onClick={handleCreateNewVersion}
                  className="flex-1 py-2.5 px-3 rounded-xl text-xs font-bold bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-[var(--text-primary)] border border-[var(--border-default)] transition-all min-h-[44px] flex items-center justify-center gap-1.5 cursor-pointer text-center"
                >
                  <PlusIcon className="w-4 h-4" />
                  <span>Editar (novo rascunho)</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Desktop Header (>=sm): Preserved full horizontal prescription toolbar */}
        <div className="hidden sm:flex sm:flex-row sm:items-center justify-between gap-4 w-full max-w-full min-w-0">
          {/* Ficha Title, Autosave Indicator and Sub-details */}
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--brand)]">
                TRAINING STUDIO
              </span>
              <span
                className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                  isDraft
                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                    : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                }`}
              >
                {isDraft
                  ? `Rascunho V${version.versionNumber}`
                  : `Publicado V${version.versionNumber}`}
              </span>
              {workout.isTemplate && (
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-[var(--surface-subtle)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                  Modelo
                </span>
              )}

              {/* Live Autosave Indicator */}
              {isDraft && (
                <div
                  data-testid="builder-autosave-indicator"
                  className="inline-flex items-center min-w-[145px] h-7 shrink-0"
                >
                  {saveStatus === "saving" && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25 whitespace-nowrap">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                      <span>Salvando…</span>
                    </span>
                  )}
                  {saveStatus === "saved" && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 whitespace-nowrap">
                      <CheckIcon className="w-3 h-3 text-emerald-500" />
                      <span>Salvo{lastSavedAt ? ` às ${lastSavedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : ""}</span>
                    </span>
                  )}
                  {saveStatus === "error" && (
                    <span
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/25 whitespace-nowrap"
                      title={saveErrorMessage || "Erro ao salvar alterações no servidor"}
                    >
                      <AlertCircleIcon className="w-3 h-3 text-rose-500" />
                      <span>Erro ao salvar</span>
                      <button
                        type="button"
                        onClick={() => retryLastSaveRef.current?.()}
                        className="underline ml-1 font-bold hover:text-rose-700 cursor-pointer"
                      >
                        Tentar novamente
                      </button>
                    </span>
                  )}
                </div>
              )}
            </div>

            {isDraft ? (
              <input
                type="text"
                value={title}
                onChange={(e) => {
                  const val = e.target.value;
                  setTitle(val);
                  scheduleMetadataSave({ title: val });
                }}
                onBlur={flushPendingMetadata}
                placeholder="Nome da ficha de treino"
                className="text-xl sm:text-2xl font-black text-[var(--text-primary)] tracking-tight bg-transparent border-b border-transparent hover:border-[var(--border-default)] focus:border-emerald-500 focus:outline-none transition-all py-0.5 max-w-xl w-full"
                title="Clique para editar o nome da ficha (salvamento automático)"
              />
            ) : (
              <h1 className="text-xl sm:text-2xl font-black text-[var(--text-primary)] tracking-tight truncate">
                {title}
              </h1>
            )}

            <div className="flex items-center gap-2 sm:gap-3 text-xs text-[var(--text-secondary)] font-medium flex-wrap">
              {objective && <span>{objective}</span>}
              {objective && <span className="opacity-40">•</span>}
              <span>
                {difficultyLevel === "BEGINNER"
                  ? "Iniciante"
                  : difficultyLevel === "ADVANCED"
                  ? "Avançado"
                  : "Intermediário"}
              </span>
              <span className="opacity-40">•</span>
              <span className="flex items-center gap-1">
                <ClockIcon className="w-3.5 h-3.5" />
                ~{estimatedDurationMinutes} min
              </span>
            </div>
          </div>

          {/* Primary Top Actions (Mobile & Desktop) */}
          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto min-w-0">
            {/* Desktop Only Inline Actions */}
            <div className="hidden sm:flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsLibrarySidebarOpen(!isLibrarySidebarOpen)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors min-h-[38px] flex items-center gap-1.5 cursor-pointer ${
                  isLibrarySidebarOpen
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                    : "bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] border-[var(--border-subtle)]"
                }`}
                title="Abrir/fechar biblioteca Studio lateral"
              >
                <SparklesIcon className="w-3.5 h-3.5 text-emerald-500" />
                <span>{isLibrarySidebarOpen ? "Biblioteca Studio" : "+ Biblioteca"}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsMetadataExpanded(!isMetadataExpanded)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)] transition-colors min-h-[38px] flex items-center gap-1.5 cursor-pointer"
                title="Editar dados da ficha"
              >
                <SlidersIcon className="w-3.5 h-3.5" />
                <span>{isMetadataExpanded ? "Ocultar dados" : "Dados da ficha"}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsPreviewOpen(true)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)] transition-colors min-h-[38px] flex items-center gap-1.5 cursor-pointer"
                title="Pré-visualizar como aluno"
              >
                <EyeIcon className="w-3.5 h-3.5" />
                <span>Pré-visualizar</span>
              </button>

              <a
                href={`/api/consultancies/${consultancySlug}/treinos/${workout.publicId}/pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-[var(--text-primary)] border border-[var(--border-subtle)] transition-all min-h-[38px] flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Baixar ficha de treino em PDF"
              >
                <DownloadIcon className="w-3.5 h-3.5 text-[var(--brand)]" />
                <span>Baixar PDF</span>
              </a>
            </div>

            {/* Core Action Buttons (Mobile: full width row / Desktop: inline) */}
            <div data-testid="mobile-builder-header" className="flex items-center gap-2 flex-wrap w-full sm:w-auto min-w-0 flex-1 sm:flex-initial">
              {isDraft && (
                <button
                  type="button"
                  data-testid="publish-workout-button"
                  onClick={handleOpenPublishDialog}
                  className="flex-1 sm:flex-initial px-3 sm:px-4 py-2.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-xs min-h-[44px] sm:min-h-[40px] flex items-center justify-center gap-1.5 cursor-pointer min-w-0 text-center"
                >
                  <SendIcon className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                  <span>Publicar</span>
                </button>
              )}

              {!isDraft && (
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(true)}
                  className="flex-1 sm:flex-initial px-3 sm:px-4 py-2.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-xs min-h-[44px] sm:min-h-[40px] flex items-center justify-center gap-1.5 cursor-pointer min-w-0 text-center"
                >
                  <UserCheckIcon className="w-4 h-4" />
                  <span>Atribuir ao aluno</span>
                </button>
              )}

              {!isDraft && (
                <button
                  type="button"
                  onClick={handleCreateNewVersion}
                  className="flex-1 sm:flex-initial px-3 sm:px-3.5 py-2.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-[var(--text-primary)] border border-[var(--border-default)] transition-all min-h-[44px] sm:min-h-[40px] flex items-center justify-center gap-1.5 cursor-pointer min-w-0 text-center"
                >
                  <PlusIcon className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                  <span>Editar (novo rascunho)</span>
                </button>
              )}

              {/* More actions menu button */}
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setIsHeaderMenuOpen(!isHeaderMenuOpen)}
                  aria-label="Mais opções do treino"
                  className="p-2.5 sm:px-3 sm:py-2 rounded-xl text-xs font-semibold bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-default)] transition-colors min-h-[44px] min-w-[44px] sm:min-h-[40px] flex items-center justify-center gap-1.5 cursor-pointer"
                  title="Mais opções do treino"
                >
                  <span className="font-extrabold tracking-widest leading-none">•••</span>
                </button>
                {isHeaderMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setIsHeaderMenuOpen(false)} />
                    <div className="absolute right-0 top-full mt-1.5 w-52 rounded-xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xl z-40 py-1.5 text-xs font-semibold text-[var(--text-primary)] divide-y divide-[var(--border-subtle)] animate-in fade-in zoom-in-95 duration-100">
                      {/* Mobile-Only Quick Access Actions */}
                      <div className="p-1 space-y-0.5 sm:hidden">
                        <button
                          type="button"
                          onClick={() => {
                            setIsHeaderMenuOpen(false);
                            setIsMetadataExpanded(!isMetadataExpanded);
                          }}
                          className="w-full px-3 py-2.5 rounded-xl hover:bg-[var(--surface-subtle)] flex items-center gap-2 text-left cursor-pointer min-h-[40px]"
                        >
                          <SlidersIcon className="w-3.5 h-3.5 text-emerald-500" />
                          <span>{isMetadataExpanded ? "Ocultar dados da ficha" : "Dados da ficha"}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsHeaderMenuOpen(false);
                            setIsPreviewOpen(true);
                          }}
                          className="w-full px-3 py-2.5 rounded-xl hover:bg-[var(--surface-subtle)] flex items-center gap-2 text-left cursor-pointer min-h-[40px]"
                        >
                          <EyeIcon className="w-3.5 h-3.5 text-teal-500" />
                          <span>Pré-visualizar como aluno</span>
                        </button>
                        <a
                          href={`/api/consultancies/${consultancySlug}/treinos/${workout.publicId}/pdf`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => setIsHeaderMenuOpen(false)}
                          className="w-full px-3 py-2.5 rounded-xl hover:bg-[var(--surface-subtle)] flex items-center gap-2 text-left cursor-pointer min-h-[40px]"
                        >
                          <DownloadIcon className="w-3.5 h-3.5 text-[var(--brand)]" />
                          <span>Baixar PDF</span>
                        </a>
                      </div>

                      <div className="p-1 space-y-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            setIsHeaderMenuOpen(false);
                            handleDuplicateFicha();
                          }}
                          className="w-full px-3 py-2.5 sm:py-2 rounded-xl hover:bg-[var(--surface-subtle)] flex items-center gap-2 text-left cursor-pointer min-h-[40px] sm:min-h-[34px]"
                        >
                          <CopyIcon className="w-3.5 h-3.5 text-blue-500" />
                          <span>Duplicar treino</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsHeaderMenuOpen(false);
                            handleSaveAsModel();
                          }}
                          className="w-full px-3 py-2.5 sm:py-2 rounded-xl hover:bg-[var(--surface-subtle)] flex items-center gap-2 text-left cursor-pointer min-h-[40px] sm:min-h-[34px]"
                        >
                          <BookmarkIcon className="w-3.5 h-3.5 text-amber-500" />
                          <span>Salvar como modelo</span>
                        </button>
                      </div>
                      <div className="p-1">
                        <button
                          type="button"
                          onClick={() => {
                            setIsHeaderMenuOpen(false);
                            setIsDeleteDialogOpen(true);
                          }}
                          className="w-full px-3 py-2.5 sm:py-2 rounded-xl hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center gap-2 text-left cursor-pointer min-h-[40px] sm:min-h-[34px]"
                        >
                          <TrashIcon className="w-3.5 h-3.5" />
                          <span>{isDraft ? "Excluir rascunho" : "Excluir treino"}</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Collapsible Metadata Drawer */}
        {isMetadataExpanded && (
          <div className="pt-4 border-t border-[var(--border-subtle)] space-y-4 animate-in fade-in duration-150">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-[var(--text-primary)]">
                  Nome da ficha *
                </label>
                <input
                  type="text"
                  value={title}
                  disabled={!isDraft}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    scheduleMetadataSave({ title: e.target.value });
                  }}
                  onBlur={flushPendingMetadata}
                  placeholder="Ex: Hipertrofia — Matheus"
                  className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface-sunken)] text-[var(--text-primary)] focus:ring-2 focus:ring-emerald-500 focus:outline-none min-h-[40px]"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-[var(--text-primary)]">
                  Objetivo principal
                </label>
                <input
                  type="text"
                  value={objective}
                  disabled={!isDraft}
                  onChange={(e) => {
                    setObjective(e.target.value);
                    scheduleMetadataSave({ objective: e.target.value });
                  }}
                  onBlur={flushPendingMetadata}
                  placeholder="Ex: Ganho de massa muscular"
                  className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface-sunken)] text-[var(--text-primary)] focus:ring-2 focus:ring-emerald-500 focus:outline-none min-h-[40px]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-[var(--text-primary)]">
                  Nível de dificuldade
                </label>
                <select
                  value={difficultyLevel}
                  disabled={!isDraft}
                  onChange={(e) => {
                    setDifficultyLevel(e.target.value);
                    scheduleMetadataSave({ difficultyLevel: e.target.value });
                  }}
                  onBlur={flushPendingMetadata}
                  className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface-sunken)] text-[var(--text-primary)] focus:ring-2 focus:ring-emerald-500 focus:outline-none min-h-[40px]"
                >
                  <option value="BEGINNER">Iniciante</option>
                  <option value="INTERMEDIATE">Intermediário</option>
                  <option value="ADVANCED">Avançado</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-[var(--text-primary)]">
                  Duração estimada (minutos)
                </label>
                <input
                  type="number"
                  min={5}
                  max={240}
                  value={estimatedDurationMinutes}
                  disabled={!isDraft}
                  onChange={(e) => {
                    const n = parseInt(e.target.value, 10) || 50;
                    setEstimatedDurationMinutes(n);
                    scheduleMetadataSave({ estimatedDurationMinutes: n });
                  }}
                  onBlur={flushPendingMetadata}
                  className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface-sunken)] text-[var(--text-primary)] focus:ring-2 focus:ring-emerald-500 focus:outline-none min-h-[40px]"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-[var(--text-primary)]">
                Observações gerais da ficha
              </label>
              <textarea
                rows={2}
                value={notes}
                disabled={!isDraft}
                onChange={(e) => {
                  setNotes(e.target.value);
                  scheduleMetadataSave({ notes: e.target.value });
                }}
                onBlur={flushPendingMetadata}
                placeholder="Orientações pré-treino, recomendações de aquecimento..."
                className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface-sunken)] text-[var(--text-primary)] focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            {isDraft && (
              <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)] text-xs text-[var(--text-tertiary)]">
                <span className="flex items-center gap-1.5 font-medium">
                  <CheckIcon className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Alterações salvas automaticamente no rascunho</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsMetadataExpanded(false)}
                  className="px-3.5 py-1.5 rounded-xl font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Workspace (Center Focus + Desktop Lateral Summary) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start w-full max-w-full min-w-0">
        {/* Central Categories List (12 cols on mobile, 8 or 12 on desktop depending on lateral sidebar) */}
        <div
          className={`w-full max-w-full min-w-0 space-y-4 ${
            isLibrarySidebarOpen ? "lg:col-span-8 xl:col-span-8" : "lg:col-span-12"
          }`}
        >
          {categories.length === 0 ? (
            <div className="p-8 sm:p-12 text-center rounded-xl border border-dashed border-[var(--border-default)] bg-[var(--surface)] space-y-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                <PlusIcon className="w-6 h-6" />
              </div>
              <div className="space-y-1 max-w-sm mx-auto">
                <h3 className="text-base font-bold text-[var(--text-primary)]">
                  Nenhuma categoria criada ainda
                </h3>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  Crie sua primeira categoria (como Peito, Costas, Bíceps ou Treino A) e adicione os exercícios.
                </p>
              </div>
              {isDraft && (
                <button
                  type="button"
                  onClick={() => setIsCreatingCategory(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors cursor-pointer"
                >
                  <PlusIcon className="w-4 h-4" />
                  <span>Criar primeira categoria</span>
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Category / Day Tabs (Desktop & Mobile) */}
              {categories.length > 1 && (
                <div className="relative w-full max-w-full min-w-0">
                  <div
                    ref={tabsContainerRef}
                    data-testid="mobile-category-tabs"
                    className="flex items-center gap-2 overflow-x-auto pb-2.5 pt-0.5 no-scrollbar scroll-smooth w-full touch-pan-x overscroll-x-contain"
                  >
                    {categories.map((cat, idx) => {
                      const isActive = activeMobileCategoryIndex === idx;
                      return (
                        <button
                          key={cat.publicId}
                          data-category-tab={idx}
                          type="button"
                          onClick={() => setActiveMobileCategoryIndex(idx)}
                          className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap min-h-[44px] transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                            isActive
                              ? "bg-emerald-600 text-white shadow-xs border border-emerald-600"
                              : "bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)]"
                          }`}
                          title={cat.title || `Treino ${idx + 1}`}
                        >
                          <span className="truncate max-w-[180px] sm:max-w-none">{cat.title || `Treino ${idx + 1}`}</span>
                          <span
                            className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full ${
                              isActive ? "bg-emerald-700/60 text-white" : "bg-[var(--surface-sunken)] text-[var(--text-tertiary)]"
                            }`}
                          >
                            {cat.items?.length || 0}
                          </span>
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      data-category-tab={-1}
                      onClick={() => setActiveMobileCategoryIndex(-1)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap min-h-[44px] transition-all shrink-0 cursor-pointer ${
                        activeMobileCategoryIndex === -1
                          ? "bg-emerald-600 text-white shadow-xs border border-emerald-600"
                          : "bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)]"
                      }`}
                    >
                      Ver todos ({categories.length})
                    </button>
                  </div>
                  {/* Subtle visual continuity hint for mobile horizontal scroll */}
                  <div className="pointer-events-none absolute right-0 top-0 bottom-2.5 w-6 bg-gradient-to-l from-[var(--surface)] to-transparent sm:hidden" />
                </div>
              )}

              {categories.map((category, catIdx) => {
                const isHidden =
                  activeMobileCategoryIndex !== -1 &&
                  activeMobileCategoryIndex !== catIdx &&
                  activeMobileCategoryIndex < categories.length;

                return (
                  <div
                    key={category.publicId}
                    className={isHidden ? "hidden" : "block"}
                  >
                    <WorkoutCategoryCard
                      category={category}
                      categoryIndex={catIdx}
                      totalCategories={categories.length}
                      allCategories={allCategoriesSimple}
                      isDraft={isDraft}
                      consultancySlug={consultancySlug}
                      onOpenExercisePicker={(catId, subBlockId) => {
                        setActiveCategoryForPicker(catId);
                        setActiveSubBlockForPicker(subBlockId || null);
                      }}
                      onRenameCategory={handleRenameCategory}
                      onDuplicateCategory={handleDuplicateCategory}
                      onDeleteCategory={handleDeleteCategory}
                      onMoveCategoryUp={(idx) => handleMoveCategory(idx, "up")}
                      onMoveCategoryDown={(idx) => handleMoveCategory(idx, "down")}
                      onDuplicateExercise={handleDuplicateExercise}
                      onMoveExerciseToCategory={handleMoveExerciseToCategory}
                      onDeleteExercise={handleDeleteExercise}
                      onMoveExerciseUp={(catId, idx) => handleMoveExercise(catId, idx, "up")}
                      onMoveExerciseDown={(catId, idx) => handleMoveExercise(catId, idx, "down")}
                      onReorderExercises={handleReorderExercises}
                      onUpdateExerciseQuickConfig={handleUpdateExerciseQuickConfig}
                      onCreateSubBlock={handleCreateSubBlock}
                      onRenameSubBlock={handleRenameSubBlock}
                      onDuplicateSubBlock={handleDuplicateSubBlock}
                      onDeleteSubBlock={handleDeleteSubBlock}
                      onMoveSubBlockUp={(catId, idx) => handleMoveSubBlock(catId, idx, "up")}
                      onMoveSubBlockDown={(catId, idx) => handleMoveSubBlock(catId, idx, "down")}
                      onResolveExercise={(itemPublicId) => {
                        setResolvingItemPublicId(itemPublicId);
                        setActiveCategoryForPicker(category.publicId);
                      }}
                      onCreateCombination={handleCreateCombination}
                      onUpdateCombination={handleUpdateCombination}
                      onUngroupCombination={handleUngroupCombination}
                      onDeleteCombination={handleDeleteCombination}
                      onDuplicateCombination={handleDuplicateCombination}
                      onMoveItemInCombination={handleMoveItemInCombination}
                      onRemoveItemFromCombination={handleRemoveItemFromCombination}
                      onOpenCreateCustomExercise={handleOpenCreateCustomExercise}
                      onOpenConfigureSequence={(item, movements) => setConfiguringSequenceItem({ item, movements })}
                    />
                  </div>
                );
              })}
            </>
          )}

          {/* New Category Button / Inline Form */}
          {isDraft && (
            <div className="pt-2">
              {isCreatingCategory ? (
                <div className="p-4 sm:p-5 rounded-xl border border-emerald-500 bg-[var(--surface)] shadow-md ring-2 ring-emerald-500/20 space-y-3.5 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                      Nova Categoria
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsCreatingCategory(false)}
                      className="p-1.5 rounded-xl text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] cursor-pointer"
                    >
                      <XIcon className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleCreateCategory();
                        if (e.key === "Escape") setIsCreatingCategory(false);
                      }}
                      autoFocus
                      placeholder="Nome da categoria (ex: Peito, Bíceps, Treino A...)"
                      className="flex-1 px-4 py-2.5 text-xs sm:text-sm font-bold uppercase rounded-xl border border-[var(--border-default)] bg-[var(--surface-sunken)] text-[var(--text-primary)] focus:ring-2 focus:ring-emerald-500 focus:outline-none min-h-[44px]"
                    />
                    <button
                      type="button"
                      disabled={!newCategoryName.trim() || isPending}
                      onClick={handleCreateCategory}
                      className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-40 transition-colors min-h-[44px] cursor-pointer"
                    >
                      {isPending ? "Criando..." : "Criar"}
                    </button>
                  </div>

                  {/* Preset quick chips */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-semibold text-[var(--text-tertiary)]">
                      Sugestões rápidas:
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {CATEGORY_PRESETS.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setNewCategoryName(preset)}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[var(--surface-subtle)] hover:bg-emerald-500/10 hover:text-emerald-600 border border-[var(--border-subtle)] text-[var(--text-secondary)] transition-colors cursor-pointer"
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsCreatingCategory(true)}
                  className="w-full py-3.5 sm:py-4 px-6 rounded-xl border-2 border-dashed border-[var(--border-default)] hover:border-emerald-500 bg-[var(--surface)] hover:bg-emerald-500/5 text-[var(--text-primary)] hover:text-emerald-600 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-2xs min-h-[50px] cursor-pointer"
                >
                  <PlusIcon className="w-5 h-5 text-emerald-500" />
                  <span>+ Nova categoria</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Desktop Sticky Studio Lateral Sidebar (Hidden on mobile) */}
        {isLibrarySidebarOpen && (
          <aside className="hidden lg:block lg:col-span-4 xl:col-span-4 sticky top-6 space-y-4">
            {/* Studio Library Panel */}
            <StudioExerciseLibrarySidebar
              consultancySlug={consultancySlug}
              categories={allCategoriesSimple}
              selectedCategoryPublicId={categories[activeMobileCategoryIndex]?.publicId || categories[0]?.publicId || null}
              onSelectCategory={(catId) => {
                const idx = categories.findIndex((c) => c.publicId === catId);
                if (idx !== -1) setActiveMobileCategoryIndex(idx);
              }}
              onAddExercise={async (catId, exercisePublicId) => {
                await handleAddExerciseToCategory(catId, exercisePublicId);
              }}
              onOpenCustomModal={(catId) => {
                handleOpenCreateCustomExercise(catId);
              }}
              onClose={() => setIsLibrarySidebarOpen(false)}
            />

            {/* Desktop Sticky Summary Panel */}
            <div className="p-4 sm:p-5 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] shadow-2xs space-y-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--brand)]">
                  RESUMO DA FICHA
                </span>
                <h3 className="text-sm font-extrabold text-[var(--text-primary)] truncate mt-0.5">
                  {title}
                </h3>
              </div>

              <div className="space-y-2 text-xs text-[var(--text-secondary)] border-y border-[var(--border-subtle)] py-3">
                <div className="flex items-center justify-between">
                  <span>Categorias:</span>
                  <span className="font-bold text-[var(--text-primary)]">
                    {categories.length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Exercícios totais:</span>
                  <span className="font-bold text-[var(--text-primary)]">
                    {totalExercises}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Duração estimada:</span>
                  <span className="font-bold text-[var(--text-primary)]">
                    ~{estimatedDurationMinutes} min
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Status:</span>
                  <span
                    className={`font-bold text-[10px] px-2 py-0.5 rounded-full ${
                      isDraft
                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                        : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    }`}
                  >
                    {isDraft ? "Rascunho" : "Publicado"}
                  </span>
                </div>
              </div>

              {/* Panel Utility Actions */}
              <div className="space-y-2 pt-1 border-t border-[var(--border-subtle)]">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={handleSaveAsModel}
                  className="w-full py-2 px-3 rounded-lg text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] border border-[var(--border-subtle)] transition-colors flex items-center justify-center gap-2 min-h-[36px] cursor-pointer"
                >
                  <BookmarkIcon className="w-3.5 h-3.5 text-amber-500" />
                  <span>Salvar como modelo</span>
                </button>

                <button
                  type="button"
                  disabled={isPending}
                  onClick={handleDuplicateFicha}
                  className="w-full py-2 px-3 rounded-lg text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] border border-[var(--border-subtle)] transition-colors flex items-center justify-center gap-2 min-h-[36px] cursor-pointer"
                >
                  <CopyIcon className="w-3.5 h-3.5 text-blue-500" />
                  <span>Duplicar ficha</span>
                </button>
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* Unified Exercise Picker Modal */}
      {(activeCategoryForPicker || resolvingItemPublicId) && (
        <UnifiedExercisePicker
          isOpen={true}
          consultancySlug={consultancySlug}
          onClose={() => {
            setActiveCategoryForPicker(null);
            setActiveSubBlockForPicker(null);
            setResolvingItemPublicId(null);
          }}
          onSelectExercise={handleSelectExercise}
          onOpenCustomModal={() => {
            if (activeCategoryForPicker) {
              handleOpenCreateCustomExercise(activeCategoryForPicker, activeSubBlockForPicker || undefined);
            }
          }}
        />
      )}

      {/* Custom Exercise Inline Modal */}
      {isCustomModalOpen && (
        <CustomExerciseInlineModal
          key={customModalTarget?.convertingItemPublicId || `${customModalTarget?.categoryPublicId}-${customModalTarget?.subBlockPublicId || "root"}`}
          isOpen={true}
          consultancySlug={consultancySlug}
          initialData={customModalTarget?.initialData}
          onClose={() => {
            setIsCustomModalOpen(false);
            setCustomModalTarget(null);
          }}
          onSave={handleSaveCustomExercise}
        />
      )}

      {/* Sequence Configuration Modal */}
      {configuringSequenceItem && (
        <SequenceConfigurationModal
          isOpen={true}
          consultancySlug={consultancySlug}
          item={configuringSequenceItem.item}
          detectedMovements={configuringSequenceItem.movements}
          onClose={() => setConfiguringSequenceItem(null)}
          onSaved={(updatedItem) => {
            setVersion((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                blocks: prev.blocks.map((b) => ({
                  ...b,
                  items: b.items.map((it) => (it.publicId === updatedItem.publicId ? updatedItem : it)),
                })),
              };
            });
            setConfiguringSequenceItem(null);
            notify("Sequência configurada com sucesso!");
            router.refresh();
          }}
        />
      )}

      {/* Workout Publish Dialog */}
      <WorkoutPublishDialog
        isOpen={isPublishDialogOpen}
        onClose={() => setIsPublishDialogOpen(false)}
        consultancySlug={consultancySlug}
        version={version}
        onPublished={(pubVersion) => {
          setVersion(pubVersion);
          setIsPublishDialogOpen(false);
          notify("Ficha publicada com sucesso!");
          router.push(
            `/consultoria/${consultancySlug}/rotinas/${workout.publicId}?version=${pubVersion.publicId}`
          );
          router.refresh();
        }}
        onResolveItem={(catId, itemId) => {
          setIsPublishDialogOpen(false);
          setActiveCategoryForPicker(catId);
          setResolvingItemPublicId(itemId);
        }}
        onCustomizeItem={(catId, subBlockId, itemId, initialData) => {
          setIsPublishDialogOpen(false);
          handleOpenCreateCustomExercise(catId, subBlockId || undefined, itemId, initialData);
        }}
      />

      {/* Workout or Template Assign Modal */}
      {workout.isTemplate ? (
        <TemplateAssignModal
          isOpen={isAssignModalOpen}
          onClose={() => setIsAssignModalOpen(false)}
          slug={consultancySlug}
          templatePublicId={workout.publicId}
          templateTitle={title}
          initialStudentMembershipPublicId={initialStudentPublicId}
          onAssigned={(assignedWorkoutPublicId: string) => {
            setIsAssignModalOpen(false);
            notify("Modelo atribuído com sucesso! Uma cópia independente foi criada para o aluno.");
            if (assignedWorkoutPublicId) {
              router.push(`/consultoria/${consultancySlug}/rotinas/${assignedWorkoutPublicId}`);
            }
          }}
        />
      ) : (
        <WorkoutAssignModal
          isOpen={isAssignModalOpen}
          onClose={() => setIsAssignModalOpen(false)}
          slug={consultancySlug}
          workoutTitle={title}
          workoutPublicId={workout.publicId}
          versionPublicId={version.publicId}
          versionNumber={version.versionNumber}
          initialStudentPublicId={initialStudentPublicId}
          onAssigned={() => {
            setIsAssignModalOpen(false);
            notify("Ficha prescrita com sucesso ao aluno!");
          }}
        />
      )}

      {/* Student View Preview Modal */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-3xl max-h-[92vh] rounded-3xl bg-[var(--surface)] border border-[var(--border-default)] shadow-2xl flex flex-col overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--surface-subtle)]">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--brand)]">
                  PRÉ-VISUALIZAÇÃO DO ALUNO
                </span>
                <h3 className="text-base font-extrabold text-[var(--text-primary)]">
                  {title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPreviewOpen(false)}
                className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)] cursor-pointer"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <StudentWorkoutRenderer
                workout={{
                  assignmentPublicId: "preview-mode",
                  consultancyName: "TREVO ONE",
                  startsOn: new Date().toISOString().split("T")[0],
                  endsOn: null,
                  versionNumber: version.versionNumber,
                  title: title,
                  subtitle: null,
                  objective: objective || null,
                  estimatedDurationMinutes: estimatedDurationMinutes,
                  difficultyLevel: difficultyLevel,
                  notesForStudent: notes || null,
                  blocks: version.blocks,
                }}
                consultancySlug={consultancySlug}
              />
            </div>
          </div>
        </div>
      )}

      {/* Simple Delete Confirmation Dialog */}
      {isDeleteDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-xl bg-[var(--surface)] border border-[var(--border-default)] shadow-2xl p-5 space-y-4">
            <div className="space-y-1.5">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center">
                <TrashIcon className="w-5 h-5" />
              </div>
              <h3 className="text-base font-extrabold text-[var(--text-primary)]">
                {isDraft ? "Excluir este rascunho?" : "Excluir este treino?"}
              </h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Esta ação removerá este {isDraft ? "rascunho de ficha" : "treino da consultoria"}.
                O histórico de treinos concluídos pelos alunos é 100% preservado.
              </p>
            </div>

            <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={isPending}
                onClick={() => setIsDeleteDialogOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer disabled:opacity-50"
              >
                {isPending ? "Excluindo..." : "Excluir"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
