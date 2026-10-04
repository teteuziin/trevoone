"use client";

import { useState, useMemo, useTransition } from "react";
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
import { WorkoutAssignModal } from "./workout-assign-modal";
import { TemplateAssignModal } from "./template-assign-modal";
import { StudentWorkoutRenderer } from "./student-workout-renderer";

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

  // Category creation inline state
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  // Modals state
  const [activeCategoryForPicker, setActiveCategoryForPicker] = useState<string | null>(null);
  const [activeSubBlockForPicker, setActiveSubBlockForPicker] = useState<string | null>(null);
  const [resolvingItemPublicId, setResolvingItemPublicId] = useState<string | null>(null);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
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

  // Save metadata
  async function handleSaveMetadata() {
    startTransition(async () => {
      const res = await updateWorkoutDraftMetadataAction(
        consultancySlug,
        version.publicId,
        {
          title: title.trim(),
          objective: objective.trim() || null,
          difficultyLevel: difficultyLevel as DifficultyLevel,
          estimatedDurationMinutes: Number(estimatedDurationMinutes) || null,
          notes: notes.trim() || null,
        }
      );
      if (res.ok && res.data) {
        setVersion(res.data);
        notify("Ficha atualizada com sucesso.");
      } else {
        notify(res.error || "Erro ao salvar ficha.");
      }
    });
  }

  // Create Category
  async function handleCreateCategory() {
    if (!newCategoryName.trim()) return;
    startTransition(async () => {
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
      }
    });
  }

  // Rename Category
  async function handleRenameCategory(categoryPublicId: string, newTitle: string) {
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
    }
  }

  // Duplicate Category
  async function handleDuplicateCategory(categoryPublicId: string) {
    const res = await duplicateCategoryAction(consultancySlug, categoryPublicId);
    if (res.ok && res.data) {
      setVersion((prev) => ({
        ...prev,
        blocks: [...prev.blocks, res.data!],
      }));
      notify("Categoria duplicada com sucesso.");
    } else {
      notify(res.error || "Erro ao duplicar categoria.");
    }
  }

  // Delete Category
  async function handleDeleteCategory(categoryPublicId: string) {
    const res = await deleteCategoryAction(consultancySlug, categoryPublicId);
    if (res.ok) {
      setVersion((prev) => ({
        ...prev,
        blocks: prev.blocks.filter((b) => b.publicId !== categoryPublicId),
      }));
      notify("Categoria removida.");
    } else {
      notify(res.error || "Erro ao remover categoria.");
    }
  }

  // Reorder Categories
  async function handleMoveCategory(categoryIndex: number, direction: "up" | "down") {
    const targetIdx = direction === "up" ? categoryIndex - 1 : categoryIndex + 1;
    if (targetIdx < 0 || targetIdx >= categories.length) return;

    const reordered = [...categories];
    const [moved] = reordered.splice(categoryIndex, 1);
    reordered.splice(targetIdx, 0, moved);

    setVersion((prev) => ({ ...prev, blocks: reordered }));

    const ids = reordered.map((b) => b.publicId);
    const res = await reorderCategoriesAction(consultancySlug, version.publicId, ids);
    if (!res.ok) {
      setVersion((prev) => ({ ...prev, blocks: categories }));
      notify(res.error || "Erro ao reordenar categorias.");
    }
  }

  // Add Exercise from Picker (or resolve unmatched exercise)
  async function handleSelectExercise(exercisePublicId: string) {
    if (resolvingItemPublicId) {
      const itemToResolve = resolvingItemPublicId;
      setResolvingItemPublicId(null);
      setActiveCategoryForPicker(null);
      setActiveSubBlockForPicker(null);
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
      }
      return;
    }

    if (!activeCategoryForPicker) return;
    const catId = activeCategoryForPicker;
    const subBlockId = activeSubBlockForPicker;
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
    }
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

    if (customModalTarget.convertingItemPublicId) {
      const res = await convertUnresolvedToCustomExerciseAction(consultancySlug, {
        itemPublicId: customModalTarget.convertingItemPublicId,
        name: data.name,
        muscleGroupPrimary: data.muscleGroup,
        equipment: data.equipment,
        customVideoUrl: data.videoUrl,
        mediaAssetPublicId: data.videoKey,
        saveToLibrary: data.saveToMyLibrary,
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
        notify(`Exercício "${data.name}" personalizado com sucesso e liberado para publicação!`);
        setIsCustomModalOpen(false);
        setCustomModalTarget(null);
      } else {
        notify(res.error || "Erro ao personalizar exercício.");
      }
      return;
    }

    const catId = customModalTarget.categoryPublicId;
    const sbId = customModalTarget.subBlockPublicId;
    const res = await createCustomExerciseAction(consultancySlug, catId, {
      name: data.name,
      muscleGroup: data.muscleGroup,
      equipment: data.equipment,
      subBlockPublicId: sbId,
      customVideoUrl: data.videoUrl,
      mediaAssetPublicId: data.videoKey,
      saveToLibrary: data.saveToMyLibrary,
      notes: data.notes,
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
    }
  }

  // Duplicate Exercise
  async function handleDuplicateExercise(itemPublicId: string) {
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
    }
  }

  // Move Exercise to Category
  async function handleMoveExerciseToCategory(
    itemPublicId: string,
    targetCategoryPublicId: string
  ) {
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
    }
  }

  // Delete Exercise
  async function handleDeleteExercise(itemPublicId: string) {
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
    }
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

    const ids = reordered.map((i) => i.publicId);
    const res = await reorderExercisesAction(consultancySlug, categoryPublicId, ids);
    if (!res.ok) {
      notify(res.error || "Erro ao reordenar exercícios.");
    }
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

    const res = await reorderExercisesAction(consultancySlug, categoryPublicId, itemPublicIds);
    if (!res.ok) {
      notify(res.error || "Erro ao reordenar exercícios.");
    }
  }

  // Update Exercise Quick Config
  async function handleUpdateExerciseQuickConfig(
    itemPublicId: string,
    config: QuickConfigInput
  ) {
    const res = await updateExerciseQuickConfigAction(consultancySlug, itemPublicId, config);
    if (res.ok && res.data) {
      setVersion((prev) => ({
        ...prev,
        blocks: prev.blocks.map((b) => ({
          ...b,
          items: b.items
            ? b.items.map((i) =>
                i.publicId === itemPublicId
                  ? { ...i, sets: res.data!, notes: config.notes ?? i.notes }
                  : i
              )
            : [],
        })),
      }));
      notify("Exercício configurado com sucesso.");
    } else {
      notify(res.error || "Erro ao configurar exercício.");
    }
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
    }
  }

  // Rename Sub-Block (Grupo)
  async function handleRenameSubBlock(subBlockPublicId: string, newTitle: string) {
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
    }
  }

  // Duplicate Sub-Block (Grupo)
  async function handleDuplicateSubBlock(subBlockPublicId: string) {
    const res = await duplicateSubBlockAction(consultancySlug, subBlockPublicId);
    if (res.ok && res.data) {
      router.refresh();
      notify("Grupo duplicado com sucesso.");
    } else {
      notify(res.error || "Erro ao duplicar grupo.");
    }
  }

  // Delete Sub-Block (Grupo)
  async function handleDeleteSubBlock(subBlockPublicId: string) {
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
    }
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

    const ids = reordered.map((sb) => sb.publicId);
    const res = await reorderSubBlocksAction(consultancySlug, categoryPublicId, ids);
    if (!res.ok) {
      notify(res.error || "Erro ao reordenar grupos.");
    }
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
    const res = await createItemCombinationAction(consultancySlug, input);
    if (res.ok && res.data) {
      const newComb = res.data;
      setVersion((prev) => ({
        ...prev,
        blocks: prev.blocks.map((b) => {
          if (b.publicId !== input.blockPublicId) return b;
          const updatedItems = (b.items || []).map((it) =>
            input.itemPublicIds.includes(it.publicId)
              ? {
                  ...it,
                  combinationPublicId: newComb.publicId,
                  combinationType: newComb.combinationType,
                  subBlockPublicId: newComb.subBlockPublicId ?? it.subBlockPublicId,
                }
              : it
          );
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
    }
  }

  async function handleUpdateCombination(
    combinationPublicId: string,
    input: {
      combinationType?: WorkoutCombinationType;
      title?: string;
      restAfterSeconds?: number;
    }
  ) {
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
      notify("Combinação atualizada.");
    } else {
      notify(res.error || "Erro ao atualizar combinação.");
    }
  }

  async function handleUngroupCombination(combinationPublicId: string) {
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
    }
  }

  async function handleDeleteCombination(combinationPublicId: string, deleteItems?: boolean) {
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
    }
  }

  async function handleDuplicateCombination(combinationPublicId: string) {
    const res = await duplicateItemCombinationAction(consultancySlug, combinationPublicId);
    if (res.ok && res.data) {
      router.refresh();
      notify("Combinação duplicada com sucesso.");
    } else {
      notify(res.error || "Erro ao duplicar combinação.");
    }
  }

  async function handleMoveItemInCombination(
    combinationPublicId: string,
    itemPublicId: string,
    direction: "up" | "down"
  ) {
    // Optimistic swap
    setVersion((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b) => {
        const comb = (b.combinations || []).find((c) => c.publicId === combinationPublicId);
        if (!comb) return b;
        const combItems = (b.items || []).filter(
          (it) => it.combinationPublicId === combinationPublicId
        );
        const idx = combItems.findIndex((it) => it.publicId === itemPublicId);
        if (idx === -1) return b;
        const targetIdx = direction === "up" ? idx - 1 : idx + 1;
        if (targetIdx < 0 || targetIdx >= combItems.length) return b;

        const itemA = combItems[idx];
        const itemB = combItems[targetIdx];
        const updatedItems = (b.items || []).map((it) => {
          if (it.publicId === itemA.publicId) return { ...it, sortOrder: itemB.sortOrder };
          if (it.publicId === itemB.publicId) return { ...it, sortOrder: itemA.sortOrder };
          return it;
        });
        const newCombItems = updatedItems
          .filter((it) => it.combinationPublicId === combinationPublicId)
          .sort((a, b) => a.sortOrder - b.sortOrder);
        const updatedCombs = (b.combinations || []).map((c) =>
          c.publicId === combinationPublicId ? { ...c, items: newCombItems } : c
        );
        return {
          ...b,
          items: updatedItems,
          combinations: updatedCombs,
        };
      }),
    }));

    const res = await moveItemInCombinationAction(
      consultancySlug,
      combinationPublicId,
      itemPublicId,
      direction
    );
    if (!res.ok) {
      notify(res.error || "Erro ao mover exercício na combinação.");
    }
  }

  async function handleRemoveItemFromCombination(
    combinationPublicId: string,
    itemPublicId: string
  ) {
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
    }
  }

  // Guard for Publishing
  function handleOpenPublishDialog() {
    if (version.status !== "DRAFT") {
      notify("Apenas versões em rascunho podem ser publicadas.");
      return;
    }
    const hasUnresolved = (version.blocks || []).some((b) =>
      (b.items || []).some((i) => !i.exercisePublicId && !i.customExercisePublicId && !i.isCustomExercise)
    );
    if (hasUnresolved) {
      notify("Não é possível publicar: existem exercícios pendentes de revisão. Resolva-os ou personalize-os antes de publicar.");
      return;
    }
    setIsPublishDialogOpen(true);
  }

  return (
    <div className="space-y-6">
      {/* Toast Feedback Notification */}
      {feedbackMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl bg-[var(--surface)] border border-emerald-500 shadow-xl text-xs sm:text-sm font-bold text-[var(--text-primary)] flex items-center gap-2.5 animate-in slide-in-from-bottom-3 duration-200">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>{feedbackMessage}</span>
        </div>
      )}

      {/* Top Header Card */}
      <div className="p-4 sm:p-6 rounded-xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs depth-surface space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Ficha Title and Sub-details */}
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--brand)]">
                FICHA DE TREINO
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
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-[var(--text-primary)] tracking-tight truncate">
              {title}
            </h1>

            <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)] font-medium flex-wrap">
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
          <div className="flex items-center gap-2 flex-wrap shrink-0 w-full sm:w-auto">
            {/* Desktop Only Inline Actions */}
            <div className="hidden sm:flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsMetadataExpanded(!isMetadataExpanded)}
                className="p-2 sm:px-3 sm:py-2 rounded-xl text-xs font-semibold bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-default)] transition-colors min-h-[40px] flex items-center gap-1.5 cursor-pointer"
                title="Editar dados da ficha"
              >
                <SlidersIcon className="w-4 h-4" />
                <span>{isMetadataExpanded ? "Ocultar dados" : "Dados da ficha"}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsPreviewOpen(true)}
                className="p-2 sm:px-3 sm:py-2 rounded-xl text-xs font-semibold bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-default)] transition-colors min-h-[40px] flex items-center gap-1.5 cursor-pointer"
                title="Pré-visualizar como aluno"
              >
                <EyeIcon className="w-4 h-4" />
                <span>Pré-visualizar</span>
              </button>

              <a
                href={`/api/consultancies/${consultancySlug}/treinos/${workout.publicId}/pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-[var(--text-primary)] border border-[var(--border-default)] transition-all min-h-[40px] flex items-center gap-1.5 cursor-pointer shadow-xs"
                title="Baixar ficha de treino em PDF"
              >
                <DownloadIcon className="w-3.5 h-3.5 text-[var(--brand)]" />
                <span>Baixar PDF</span>
              </a>
            </div>

            {/* Core Action Buttons (Mobile: full width row / Desktop: inline) */}
            <div data-testid="mobile-builder-header" className="flex items-center gap-2 flex-1 sm:flex-initial">
              {isDraft && (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={handleSaveMetadata}
                  className="flex-1 sm:flex-initial px-4 py-2.5 sm:px-3.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-[var(--text-primary)] border border-[var(--border-strong)] transition-all min-h-[44px] sm:min-h-[40px] flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <CheckIcon className="w-4 h-4" />
                  <span>Salvar</span>
                </button>
              )}

              {isDraft && (
                <button
                  type="button"
                  onClick={handleOpenPublishDialog}
                  className="flex-1 sm:flex-initial px-4 py-2.5 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-xs min-h-[44px] sm:min-h-[40px] flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <SendIcon className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                  <span>Publicar</span>
                </button>
              )}

              {!isDraft && (
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(true)}
                  className="flex-1 sm:flex-initial px-4 py-2.5 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-xs min-h-[44px] sm:min-h-[40px] flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <UserCheckIcon className="w-4 h-4" />
                  <span>Atribuir ao aluno</span>
                </button>
              )}

              {!isDraft && (
                <button
                  type="button"
                  onClick={handleCreateNewVersion}
                  className="flex-1 sm:flex-initial px-4 py-2.5 sm:px-3.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-[var(--text-primary)] border border-[var(--border-default)] transition-all min-h-[44px] sm:min-h-[40px] flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <PlusIcon className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                  <span>Editar (novo rascunho)</span>
                </button>
              )}

              {/* More actions menu button */}
              <div className="relative">
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
                  onChange={(e) => setTitle(e.target.value)}
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
                  onChange={(e) => setObjective(e.target.value)}
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
                  onChange={(e) => setDifficultyLevel(e.target.value)}
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
                  onChange={(e) =>
                    setEstimatedDurationMinutes(parseInt(e.target.value, 10) || 50)
                  }
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
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Orientações pré-treino, recomendações de aquecimento..."
                className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface-sunken)] text-[var(--text-primary)] focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            {isDraft && (
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={handleSaveMetadata}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white min-h-[38px] flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckIcon className="w-3.5 h-3.5" />
                  <span>Salvar dados</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Workspace (Center Focus + Desktop Lateral Summary) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Central Categories List (12 cols on mobile, 9 cols on desktop) */}
        <div className="lg:col-span-8 xl:col-span-9 space-y-4">
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
              {/* Mobile Category / Day Tabs (md:hidden) */}
              {categories.length > 1 && (
                <div
                  data-testid="mobile-category-tabs"
                  className="md:hidden flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none"
                >
                  {categories.map((cat, idx) => (
                    <button
                      key={cat.publicId}
                      type="button"
                      onClick={() => setActiveMobileCategoryIndex(idx)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap min-h-[44px] transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                        activeMobileCategoryIndex === idx
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] border border-[var(--border-default)]"
                      }`}
                    >
                      <span>{cat.title || `Treino ${idx + 1}`}</span>
                      <span className="text-[10px] opacity-75">({cat.items?.length || 0})</span>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setActiveMobileCategoryIndex(-1)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap min-h-[44px] transition-all shrink-0 cursor-pointer ${
                      activeMobileCategoryIndex === -1
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] border border-[var(--border-default)]"
                    }`}
                  >
                    Ver todos
                  </button>
                </div>
              )}

              {categories.map((category, catIdx) => {
                const isHiddenOnMobile =
                  activeMobileCategoryIndex !== -1 &&
                  activeMobileCategoryIndex !== catIdx &&
                  activeMobileCategoryIndex < categories.length;

                return (
                  <div
                    key={category.publicId}
                    className={isHiddenOnMobile ? "hidden md:block" : "block"}
                  >
                    <WorkoutCategoryCard
                      category={category}
                      categoryIndex={catIdx}
                      totalCategories={categories.length}
                      allCategories={allCategoriesSimple}
                      isDraft={isDraft}
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

        {/* Desktop Sticky Summary Panel (Hidden on mobile) */}
        <aside className="hidden lg:block lg:col-span-4 xl:col-span-3 sticky top-6 space-y-4">
          <div className="p-5 rounded-xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs space-y-4 depth-surface">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--brand)]">
                RESUMO DA FICHA
              </span>
              <h3 className="text-base font-extrabold text-[var(--text-primary)] truncate mt-0.5">
                {title}
              </h3>
            </div>

            <div className="space-y-2.5 text-xs text-[var(--text-secondary)] border-y border-[var(--border-subtle)] py-3">
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
                  className={`font-bold text-[11px] px-2 py-0.5 rounded-full ${
                    isDraft
                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  }`}
                >
                  {isDraft ? "Rascunho" : "Publicado"}
                </span>
              </div>
            </div>

            {/* Panel Quick Actions */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setIsPreviewOpen(true)}
                className="w-full py-2.5 px-3 rounded-xl text-xs font-bold bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-[var(--text-primary)] border border-[var(--border-default)] transition-colors flex items-center justify-center gap-2 min-h-[38px] cursor-pointer"
              >
                <EyeIcon className="w-4 h-4 text-blue-500" />
                <span>Pré-visualizar</span>
              </button>

              {isDraft ? (
                <button
                  type="button"
                  onClick={handleOpenPublishDialog}
                  className="w-full py-2.5 px-3 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-xs flex items-center justify-center gap-2 min-h-[38px] cursor-pointer"
                >
                  <SendIcon className="w-3.5 h-3.5" />
                  <span>Publicar ficha</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(true)}
                  className="w-full py-2.5 px-3 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-xs flex items-center justify-center gap-2 min-h-[38px] cursor-pointer"
                >
                  <UserCheckIcon className="w-4 h-4" />
                  <span>Atribuir ao aluno</span>
                </button>
              )}

              <button
                type="button"
                disabled={isPending}
                onClick={handleSaveAsModel}
                className="w-full py-2 px-3 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] transition-colors flex items-center justify-center gap-2 min-h-[36px] cursor-pointer"
              >
                <BookmarkIcon className="w-3.5 h-3.5" />
                <span>Salvar como modelo</span>
              </button>

              <button
                type="button"
                disabled={isPending}
                onClick={handleDuplicateFicha}
                className="w-full py-2 px-3 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] transition-colors flex items-center justify-center gap-2 min-h-[36px] cursor-pointer"
              >
                <CopyIcon className="w-3.5 h-3.5" />
                <span>Duplicar ficha</span>
              </button>
            </div>
          </div>
        </aside>
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
