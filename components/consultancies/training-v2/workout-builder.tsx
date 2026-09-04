"use client";

import { useState, useTransition } from "react";
import type {
  WorkoutRootDto,
  WorkoutVersionDto,
  WorkoutBlockType,
  PrescriptionMode,
  CardioMethodConfig,
  WarmupMethodConfig,
  DifficultyLevel,
} from "@/lib/training-v2/types";
import {
  updateWorkoutDraftMetadataAction,
  duplicateBlockAction,
  reorderBlocksAction,
  removeBlockAction,
  addExerciseItemToBlockAction,
  addCustomItemToBlockAction,
  removeItemAction,
  updateNormalSetsAction,
  updateBlockTitleAction,
  createMethodBlockAction,
  updateBlockConfigurationAction,
  replaceDropSetStructureAction,
  replaceRestPauseStructureAction,
  updateCardioConfigurationAction,
  updateWarmupConfigurationAction,
} from "@/app/consultoria/[slug]/rotinas/actions";
import { WorkoutBlockCard } from "./workout-block-card";
import { WorkoutMethodSelectorModal } from "./workout-method-selector-modal";
import { UnifiedExercisePicker } from "./unified-exercise-picker";
import { CustomExerciseInlineModal } from "./custom-exercise-inline-modal";

function Clock({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Dumbbell({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.5 6.5l11 11M6.5 17.5l11-11M3 8l3-3m0 0l3 3M3 16l3 3m0 0l3-3m9-8l3-3m0 0l3 3m-3 11l3-3m0 0l3 3" />
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

function Settings({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="3" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function X({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function Check({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AlertCircle({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function Loader2({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" />
    </svg>
  );
}

function Layers({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="2 12 12 17 22 12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Edit3({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );
}

type WorkoutBuilderProps = {
  consultancySlug: string;
  workout: WorkoutRootDto;
  initialDraftVersion: WorkoutVersionDto;
  isConsultancyAdmin?: boolean;
};

const DIFFICULTY_LABELS: Record<DifficultyLevel, string> = {
  BEGINNER: "Iniciante",
  INTERMEDIATE: "Intermediário",
  ADVANCED: "Avançado",
};

export function WorkoutBuilder({
  consultancySlug,
  initialDraftVersion,
}: WorkoutBuilderProps) {
  const [draft, setDraft] = useState<WorkoutVersionDto>(initialDraftVersion);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  // Metadata Edit Modal State
  const [isEditingMetadata, setIsEditingMetadata] = useState(false);
  const [metaTitle, setMetaTitle] = useState(draft.title);
  const [metaSubtitle, setMetaSubtitle] = useState(draft.subtitle || "");
  const [metaObjective, setMetaObjective] = useState(draft.objective || "");
  const [metaDuration, setMetaDuration] = useState<string>(
    draft.estimatedDurationMinutes ? String(draft.estimatedDurationMinutes) : ""
  );
  const [metaDifficulty, setMetaDifficulty] = useState<DifficultyLevel>(
    (draft.difficultyLevel as DifficultyLevel) || "INTERMEDIATE"
  );
  const [metaNotes, setMetaNotes] = useState(draft.notes || "");
  const [savingMetadata, setSavingMetadata] = useState(false);

  // Method Selector Modal State
  const [isMethodModalOpen, setIsMethodModalOpen] = useState(false);

  // Picker & Custom Modal States
  const [activePickerBlockId, setActivePickerBlockId] = useState<string | null>(null);
  const [activeCustomBlockId, setActiveCustomBlockId] = useState<string | null>(null);

  // General loading transition
  const [isPending, startTransition] = useTransition();

  const showNotification = (type: "success" | "error" | "info", text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => {
      setStatusMessage(null);
    }, 4000);
  };

  // 1. SAVE METADATA
  const handleSaveMetadata = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!metaTitle.trim()) {
      showNotification("error", "O título do treino é obrigatório.");
      return;
    }

    setSavingMetadata(true);
    try {
      const res = await updateWorkoutDraftMetadataAction(consultancySlug, draft.publicId, {
        title: metaTitle.trim(),
        subtitle: metaSubtitle.trim() || null,
        objective: metaObjective.trim() || null,
        estimatedDurationMinutes: metaDuration ? parseInt(metaDuration, 10) : null,
        difficultyLevel: metaDifficulty,
        notes: metaNotes.trim() || null,
      });

      if (!res.ok || !res.data) {
        showNotification("error", res.error || "Erro ao salvar informações do treino.");
      } else {
        setDraft(res.data);
        setIsEditingMetadata(false);
        showNotification("success", "Informações do treino atualizadas!");
      }
    } catch {
      showNotification("error", "Erro de conexão ao salvar informações.");
    } finally {
      setSavingMetadata(false);
    }
  };

  // 2. CREATE METHOD BLOCK
  const handleCreateMethodBlock = async (method: WorkoutBlockType) => {
    const nextOrder = (draft.blocks?.length || 0) + 1;
    const defaultTitle = `Bloco ${String.fromCharCode(64 + nextOrder)}`;
    setIsMethodModalOpen(false);

    startTransition(async () => {
      try {
        const res = await createMethodBlockAction(consultancySlug, draft.publicId, {
          blockType: method,
          title: defaultTitle,
        });

        if (!res.ok || !res.data) {
          showNotification("error", res.error || "Erro ao adicionar bloco.");
          return;
        }

        setDraft((prev) => ({
          ...prev,
          blocks: [...(prev.blocks || []), res.data!],
        }));
        showNotification("success", `Novo bloco adicionado (${res.data.title || defaultTitle})`);
      } catch {
        showNotification("error", "Falha ao adicionar novo bloco.");
      }
    });
  };

  // 3. MOVE BLOCK UP
  const handleMoveBlockUp = async (index: number) => {
    if (index <= 0 || !draft.blocks) return;
    const newBlocks = [...draft.blocks];
    const temp = newBlocks[index - 1];
    newBlocks[index - 1] = newBlocks[index];
    newBlocks[index] = temp;

    setDraft((prev) => ({ ...prev, blocks: newBlocks }));

    try {
      const idsInOrder = newBlocks.map((b) => b.publicId);
      const res = await reorderBlocksAction(consultancySlug, draft.publicId, idsInOrder);
      if (!res.ok) {
        showNotification("error", res.error || "Erro ao salvar nova ordem dos blocos.");
      }
    } catch {
      showNotification("error", "Falha ao reordenar blocos.");
    }
  };

  // 4. MOVE BLOCK DOWN
  const handleMoveBlockDown = async (index: number) => {
    if (!draft.blocks || index >= draft.blocks.length - 1) return;
    const newBlocks = [...draft.blocks];
    const temp = newBlocks[index + 1];
    newBlocks[index + 1] = newBlocks[index];
    newBlocks[index] = temp;

    setDraft((prev) => ({ ...prev, blocks: newBlocks }));

    try {
      const idsInOrder = newBlocks.map((b) => b.publicId);
      const res = await reorderBlocksAction(consultancySlug, draft.publicId, idsInOrder);
      if (!res.ok) {
        showNotification("error", res.error || "Erro ao salvar nova ordem dos blocos.");
      }
    } catch {
      showNotification("error", "Falha ao reordenar blocos.");
    }
  };

  // 5. DUPLICATE BLOCK
  const handleDuplicateBlock = async (blockPublicId: string) => {
    try {
      const res = await duplicateBlockAction(consultancySlug, blockPublicId);
      if (!res.ok || !res.data) {
        showNotification("error", res.error || "Erro ao duplicar bloco.");
        return;
      }

      setDraft((prev) => ({
        ...prev,
        blocks: [...(prev.blocks || []), res.data!],
      }));
      showNotification("success", "Bloco duplicado com sucesso!");
    } catch {
      showNotification("error", "Falha ao duplicar bloco.");
    }
  };

  // 6. REMOVE BLOCK
  const handleRemoveBlock = async (blockPublicId: string) => {
    try {
      const res = await removeBlockAction(consultancySlug, blockPublicId);
      if (!res.ok) {
        showNotification("error", res.error || "Erro ao remover bloco.");
        return;
      }

      setDraft((prev) => ({
        ...prev,
        blocks: (prev.blocks || []).filter((b) => b.publicId !== blockPublicId),
      }));
      showNotification("success", "Bloco removido!");
    } catch {
      showNotification("error", "Falha ao remover bloco.");
    }
  };

  // 7. SELECT EXERCISE FROM PICKER
  const handleSelectExerciseFromPicker = async (exercisePublicId: string) => {
    if (!activePickerBlockId) return;
    const targetBlockId = activePickerBlockId;

    try {
      const res = await addExerciseItemToBlockAction(
        consultancySlug,
        targetBlockId,
        exercisePublicId
      );

      if (!res.ok || !res.data) {
        showNotification("error", res.error || "Erro ao adicionar exercício.");
        return;
      }

      setDraft((prev) => ({
        ...prev,
        blocks: (prev.blocks || []).map((b) => {
          if (b.publicId !== targetBlockId) return b;
          return {
            ...b,
            items: [...(b.items || []), res.data!],
          };
        }),
      }));

      setActivePickerBlockId(null);
      showNotification("success", "Exercício adicionado ao bloco!");
    } catch {
      showNotification("error", "Falha ao vincular exercício ao bloco.");
    }
  };

  // 8. ADD INLINE CUSTOM EXERCISE
  const handleSaveCustomExercise = async (customSnapshot: {
    exerciseName: string;
    muscleGroup?: string;
    equipment?: string;
    instructions?: string;
  }) => {
    if (!activeCustomBlockId) return;
    const targetBlockId = activeCustomBlockId;

    try {
      const res = await addCustomItemToBlockAction(
        consultancySlug,
        targetBlockId,
        customSnapshot
      );

      if (!res.ok || !res.data) {
        showNotification("error", res.error || "Erro ao adicionar exercício personalizado.");
        return;
      }

      setDraft((prev) => ({
        ...prev,
        blocks: (prev.blocks || []).map((b) => {
          if (b.publicId !== targetBlockId) return b;
          return {
            ...b,
            items: [...(b.items || []), res.data!],
          };
        }),
      }));

      setActiveCustomBlockId(null);
      showNotification("success", "Exercício personalizado criado!");
    } catch {
      showNotification("error", "Falha ao criar exercício personalizado.");
    }
  };

  // 9. REMOVE ITEM FROM BLOCK
  const handleRemoveItem = async (blockPublicId: string, itemPublicId: string) => {
    try {
      const res = await removeItemAction(consultancySlug, itemPublicId);
      if (!res.ok) {
        showNotification("error", res.error || "Erro ao remover item.");
        return;
      }

      setDraft((prev) => ({
        ...prev,
        blocks: (prev.blocks || []).map((b) => {
          if (b.publicId !== blockPublicId) return b;
          return {
            ...b,
            items: (b.items || []).filter((it) => it.publicId !== itemPublicId),
          };
        }),
      }));
      showNotification("success", "Exercício removido do bloco!");
    } catch {
      showNotification("error", "Falha ao remover exercício do bloco.");
    }
  };

  // 10. UPDATE SETS FOR ITEM (NORMAL)
  const handleUpdateSets = async (
    blockPublicId: string,
    itemPublicId: string,
    sets: Array<{
      setNumber: number;
      targetReps?: number | null;
      targetRepsMax?: number | null;
      targetLoadKg?: number | null;
      targetRestSeconds?: number | null;
    }>
  ) => {
    try {
      const res = await updateNormalSetsAction(consultancySlug, itemPublicId, sets);
      if (!res.ok || !res.data) {
        showNotification("error", res.error || "Erro ao salvar séries.");
        return;
      }

      setDraft((prev) => ({
        ...prev,
        blocks: (prev.blocks || []).map((b) => {
          if (b.publicId !== blockPublicId) return b;
          return {
            ...b,
            items: (b.items || []).map((it) => {
              if (it.publicId !== itemPublicId) return it;
              return {
                ...it,
                sets: res.data!,
              };
            }),
          };
        }),
      }));
      showNotification("success", "Séries salvas com sucesso!");
    } catch {
      showNotification("error", "Falha ao atualizar séries.");
    }
  };

  // 11. UPDATE BLOCK TITLE
  const handleUpdateBlockTitle = async (blockPublicId: string, title: string | null) => {
    try {
      const res = await updateBlockTitleAction(consultancySlug, blockPublicId, title);
      if (!res.ok || !res.data) {
        showNotification("error", res.error || "Erro ao atualizar título do bloco.");
        return;
      }

      setDraft((prev) => ({
        ...prev,
        blocks: (prev.blocks || []).map((b) => {
          if (b.publicId !== blockPublicId) return b;
          return {
            ...b,
            title: res.data!.title,
          };
        }),
      }));
      showNotification("success", "Título do bloco atualizado!");
    } catch {
      showNotification("error", "Falha ao salvar título do bloco.");
    }
  };

  // 12. UPDATE CIRCUIT CONFIGURATION
  const handleUpdateCircuitConfig = async (
    blockPublicId: string,
    config: {
      rounds: number;
      restBetweenItemsSeconds: number;
      restBetweenRoundsSeconds: number;
      restAfterBlockSeconds: number;
      instructions: string | null;
    }
  ) => {
    try {
      const res = await updateBlockConfigurationAction(consultancySlug, blockPublicId, config);
      if (!res.ok || !res.data) {
        showNotification("error", res.error || "Erro ao salvar parâmetros do circuito.");
        return;
      }

      setDraft((prev) => ({
        ...prev,
        blocks: (prev.blocks || []).map((b) => (b.publicId === blockPublicId ? res.data! : b)),
      }));
      showNotification("success", "Configurações do circuito salvas!");
    } catch {
      showNotification("error", "Falha ao atualizar parâmetros do circuito.");
    }
  };

  // 13. REPLACE DROP-SET STRUCTURE
  const handleReplaceDropSet = async (
    blockPublicId: string,
    itemPublicId: string,
    payload: {
      initialSet: {
        targetReps?: number | null;
        targetRepsMax?: number | null;
        targetLoadKg?: number | null;
        targetRestSeconds?: number | null;
        intensityIndicator?: string | null;
      };
      dropStages: Array<{
        targetReps?: number | null;
        targetRepsMax?: number | null;
        targetLoadKg?: number | null;
        intensityIndicator?: string | null;
      }>;
    }
  ) => {
    try {
      const res = await replaceDropSetStructureAction(consultancySlug, itemPublicId, payload);
      if (!res.ok || !res.data) {
        showNotification("error", res.error || "Erro ao salvar séries de Drop-Set.");
        return;
      }

      setDraft((prev) => ({
        ...prev,
        blocks: (prev.blocks || []).map((b) => {
          if (b.publicId !== blockPublicId) return b;
          return {
            ...b,
            items: (b.items || []).map((it) => {
              if (it.publicId !== itemPublicId) return it;
              return {
                ...it,
                sets: res.data!,
              };
            }),
          };
        }),
      }));
      showNotification("success", "Séries de Drop-Set salvas!");
    } catch {
      showNotification("error", "Falha ao salvar Drop-Set.");
    }
  };

  // 14. REPLACE REST-PAUSE STRUCTURE
  const handleReplaceRestPause = async (
    blockPublicId: string,
    itemPublicId: string,
    payload: {
      config: {
        intraPauseSeconds: number;
        targetTotalReps?: number | null;
      };
      initialSet: {
        targetReps?: number | null;
        targetLoadKg?: number | null;
        targetRestSeconds?: number | null;
        intensityIndicator?: string | null;
      };
      miniSets: Array<{
        targetReps?: number | null;
        targetLoadKg?: number | null;
        intensityIndicator?: string | null;
      }>;
    }
  ) => {
    try {
      const res = await replaceRestPauseStructureAction(consultancySlug, itemPublicId, payload);
      if (!res.ok || !res.data) {
        showNotification("error", res.error || "Erro ao salvar séries de Rest-Pause.");
        return;
      }

      setDraft((prev) => ({
        ...prev,
        blocks: (prev.blocks || []).map((b) => {
          if (b.publicId !== blockPublicId) return b;
          return {
            ...b,
            items: (b.items || []).map((it) => {
              if (it.publicId !== itemPublicId) return it;
              return {
                ...it,
                methodConfig: payload.config,
                sets: res.data!,
              };
            }),
          };
        }),
      }));
      showNotification("success", "Séries de Rest-Pause salvas!");
    } catch {
      showNotification("error", "Falha ao salvar Rest-Pause.");
    }
  };

  // 15. UPDATE CARDIO CONFIGURATION
  const handleUpdateCardio = async (
    blockPublicId: string,
    itemPublicId: string,
    payload: {
      prescriptionMode: PrescriptionMode;
      config: CardioMethodConfig;
      targetDurationSeconds?: number | null;
      targetDistanceMeters?: number | null;
      targetRestSeconds?: number | null;
      notes?: string | null;
    }
  ) => {
    try {
      const res = await updateCardioConfigurationAction(consultancySlug, itemPublicId, payload);
      if (!res.ok || !res.data) {
        showNotification("error", res.error || "Erro ao salvar configuração de Cardio.");
        return;
      }

      setDraft((prev) => ({
        ...prev,
        blocks: (prev.blocks || []).map((b) => {
          if (b.publicId !== blockPublicId) return b;
          return {
            ...b,
            items: (b.items || []).map((it) => {
              if (it.publicId !== itemPublicId) return it;
              return {
                ...it,
                prescriptionMode: payload.prescriptionMode,
                methodConfig: res.data!.config,
                notes: payload.notes || it.notes,
                sets: res.data!.sets,
              };
            }),
          };
        }),
      }));
      showNotification("success", "Configuração de Cardio salva!");
    } catch {
      showNotification("error", "Falha ao salvar Cardio.");
    }
  };

  const handleUpdateWarmup = async (
    blockPublicId: string,
    itemPublicId: string,
    payload: {
      config: WarmupMethodConfig;
    }
  ) => {
    try {
      const res = await updateWarmupConfigurationAction(consultancySlug, itemPublicId, payload);
      if (!res.ok || !res.data) {
        showNotification("error", res.error || "Erro ao salvar configuração de Aquecimento.");
        return;
      }

      setDraft((prev) => ({
        ...prev,
        blocks: (prev.blocks || []).map((b) => {
          if (b.publicId !== blockPublicId) return b;
          return {
            ...b,
            items: (b.items || []).map((it) => {
              if (it.publicId !== itemPublicId) return it;
              return {
                ...it,
                methodConfig: res.data!,
              };
            }),
          };
        }),
      }));
      showNotification("success", "Configuração de Aquecimento salva!");
    } catch {
      showNotification("error", "Falha ao salvar Aquecimento.");
    }
  };

  const blocks = draft.blocks || [];

  return (
    <div className="space-y-6">
      {/* Toast / Notification Banner */}
      {statusMessage && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl border backdrop-blur-md transition-all text-xs font-medium animate-in fade-in slide-in-from-top-2 ${
            statusMessage.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
              : statusMessage.type === "error"
              ? "bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400"
              : "bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400"
          }`}
        >
          {statusMessage.type === "success" ? (
            <Check className="w-4 h-4 text-emerald-500 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Routine Metadata Card */}
      <section className="bg-[var(--surface)] border border-[var(--border-default)] rounded-3xl p-5 md:p-7 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                Rascunho
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[var(--surface-subtle)] text-[var(--foreground-muted)] border border-[var(--border-subtle)]">
                Versão {draft.versionNumber}
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[var(--surface-subtle)] text-[var(--foreground-muted)] border border-[var(--border-subtle)]">
                {DIFFICULTY_LABELS[draft.difficultyLevel as DifficultyLevel] ||
                  draft.difficultyLevel}
              </span>
            </div>

            <h1 className="text-xl md:text-2xl font-black tracking-tight text-[var(--foreground)]">
              {draft.title}
            </h1>

            {draft.subtitle && (
              <p className="text-sm font-medium text-[var(--foreground-muted)]">
                {draft.subtitle}
              </p>
            )}

            {draft.objective && (
              <p className="text-xs text-[var(--foreground-muted)] bg-[var(--surface-subtle)] px-3 py-1.5 rounded-xl inline-block border border-[var(--border-subtle)]">
                <span className="font-semibold text-[var(--foreground)]">Objetivo:</span>{" "}
                {draft.objective}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsEditingMetadata(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)] text-[var(--foreground)] hover:bg-[var(--surface-sunken)] transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5 text-[var(--foreground-muted)]" />
              Editar Informações
            </button>
          </div>
        </div>

        {draft.notes && (
          <div className="mt-4 pt-4 border-t border-[var(--border-subtle)] text-xs text-[var(--foreground-muted)]">
            <span className="font-semibold text-[var(--foreground)]">Observações:</span>{" "}
            {draft.notes}
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-4 text-xs text-[var(--foreground-muted)] pt-4 border-t border-[var(--border-subtle)]">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-emerald-500" />
            <span>
              {draft.estimatedDurationMinutes
                ? `${draft.estimatedDurationMinutes} min estimados`
                : "Duração não definida"}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-emerald-500" />
            <span>{blocks.length} {blocks.length === 1 ? "bloco" : "blocos"}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Dumbbell className="w-3.5 h-3.5 text-emerald-500" />
            <span>
              {blocks.reduce((acc, b) => acc + (b.items?.length || 0), 0)} exercícios
            </span>
          </div>
        </div>
      </section>

      {/* Routine Blocks List */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-[var(--foreground)] flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-500" />
            Estrutura de Blocos (11 Métodos)
          </h2>

          <button
            onClick={() => setIsMethodModalOpen(true)}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-xs disabled:opacity-50"
          >
            {isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Plus className="w-3.5 h-3.5" />
            )}
            Adicionar Bloco
          </button>
        </div>

        {blocks.length === 0 ? (
          <div className="p-12 text-center rounded-3xl border border-dashed border-[var(--border-default)] bg-[var(--surface-subtle)] space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
              <Layers className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-[var(--foreground)]">
                Nenhum bloco de exercício adicionado
              </h3>
              <p className="text-xs text-[var(--foreground-muted)] max-w-sm mx-auto">
                Adicione blocos com qualquer uma das 11 metodologias disponíveis (Série Simples, Bi-Set, Tri-Set, Circuito, Drop-Set, Rest-Pause, Cardio...).
              </p>
            </div>
            <button
              onClick={() => setIsMethodModalOpen(true)}
              disabled={isPending}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              Escolher Metodologia do 1º Bloco
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {blocks.map((block, index) => (
              <WorkoutBlockCard
                key={block.publicId}
                block={block}
                blockIndex={index}
                totalBlocks={blocks.length}
                onMoveUp={() => handleMoveBlockUp(index)}
                onMoveDown={() => handleMoveBlockDown(index)}
                onDuplicate={() => handleDuplicateBlock(block.publicId)}
                onRemove={() => handleRemoveBlock(block.publicId)}
                onOpenPicker={() => setActivePickerBlockId(block.publicId)}
                onRemoveItem={(itemPublicId) =>
                  handleRemoveItem(block.publicId, itemPublicId)
                }
                onUpdateSets={(itemPublicId, sets) =>
                  handleUpdateSets(block.publicId, itemPublicId, sets)
                }
                onUpdateBlockTitle={(title) =>
                  handleUpdateBlockTitle(block.publicId, title)
                }
                onUpdateCircuitConfig={(config) =>
                  handleUpdateCircuitConfig(block.publicId, config)
                }
                onReplaceDropSet={(itemPublicId, payload) =>
                  handleReplaceDropSet(block.publicId, itemPublicId, payload)
                }
                onReplaceRestPause={(itemPublicId, payload) =>
                  handleReplaceRestPause(block.publicId, itemPublicId, payload)
                }
                onUpdateCardio={(itemPublicId, payload) =>
                  handleUpdateCardio(block.publicId, itemPublicId, payload)
                }
                onUpdateWarmup={(itemPublicId, payload) =>
                  handleUpdateWarmup(block.publicId, itemPublicId, payload)
                }
              />
            ))}
          </div>
        )}
      </section>

      {/* Bottom Floating/Fixed Action to Add Block */}
      {blocks.length > 0 && (
        <div className="pt-2 flex justify-center">
          <button
            onClick={() => setIsMethodModalOpen(true)}
            disabled={isPending}
            className="inline-flex items-center gap-2 px-5 py-3 text-xs font-semibold rounded-2xl bg-[var(--surface)] border border-[var(--border-default)] text-[var(--foreground)] hover:bg-[var(--surface-sunken)] transition-colors shadow-xs disabled:opacity-50"
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
            ) : (
              <Plus className="w-4 h-4 text-emerald-500" />
            )}
            Adicionar Novo Bloco de Exercícios
          </button>
        </div>
      )}

      {/* 11-Method Selector Modal */}
      <WorkoutMethodSelectorModal
        isOpen={isMethodModalOpen}
        onClose={() => setIsMethodModalOpen(false)}
        onSelectMethod={handleCreateMethodBlock}
        isSubmitting={isPending}
      />

      {/* Unified Exercise Picker Modal */}
      <UnifiedExercisePicker
        isOpen={!!activePickerBlockId}
        consultancySlug={consultancySlug}
        onClose={() => setActivePickerBlockId(null)}
        onSelectExercise={handleSelectExerciseFromPicker}
        onOpenCustomModal={() => {
          const currentBlock = activePickerBlockId;
          setActivePickerBlockId(null);
          setActiveCustomBlockId(currentBlock);
        }}
      />

      {/* Custom Exercise Inline Modal */}
      <CustomExerciseInlineModal
        isOpen={!!activeCustomBlockId}
        onClose={() => setActiveCustomBlockId(null)}
        onSave={handleSaveCustomExercise}
      />

      {/* Metadata Edit Modal */}
      {isEditingMetadata && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg bg-[var(--surface)] border border-[var(--border-default)] rounded-3xl shadow-2xl p-6 space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
              <h2 className="text-base font-bold text-[var(--foreground)] flex items-center gap-2">
                <Settings className="w-4 h-4 text-emerald-500" />
                Editar Informações do Treino
              </h2>
              <button
                onClick={() => setIsEditingMetadata(false)}
                className="p-1.5 rounded-xl hover:bg-[var(--surface-subtle)] text-[var(--foreground-muted)] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveMetadata} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--foreground)]">
                  Nome / Título da Rotina *
                </label>
                <input
                  type="text"
                  required
                  value={metaTitle}
                  onChange={(e) => setMetaTitle(e.target.value)}
                  placeholder="Ex: Treino A - Hipertrofia Peitoral e Tríceps"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-xs text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--foreground)]">
                  Subtítulo / Foco
                </label>
                <input
                  type="text"
                  value={metaSubtitle}
                  onChange={(e) => setMetaSubtitle(e.target.value)}
                  placeholder="Ex: Foco na porção clavicular e progressão de carga"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-xs text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--foreground)]">
                    Nível de Dificuldade
                  </label>
                  <select
                    value={metaDifficulty}
                    onChange={(e) =>
                      setMetaDifficulty(e.target.value as DifficultyLevel)
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-xs text-[var(--foreground)] focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  >
                    <option value="BEGINNER">Iniciante</option>
                    <option value="INTERMEDIATE">Intermediário</option>
                    <option value="ADVANCED">Avançado</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--foreground)]">
                    Duração Estimada (minutos)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="360"
                    value={metaDuration}
                    onChange={(e) => setMetaDuration(e.target.value)}
                    placeholder="Ex: 50"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-xs text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--foreground)]">
                  Objetivo Principal
                </label>
                <input
                  type="text"
                  value={metaObjective}
                  onChange={(e) => setMetaObjective(e.target.value)}
                  placeholder="Ex: Hipertrofia, Força, Resistência, etc."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-xs text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--foreground)]">
                  Observações Gerais / Instruções
                </label>
                <textarea
                  rows={3}
                  value={metaNotes}
                  onChange={(e) => setMetaNotes(e.target.value)}
                  placeholder="Orientações de aquecimento, pausas ou recomendações especiais..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-xs text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-subtle)]">
                <button
                  type="button"
                  onClick={() => setIsEditingMetadata(false)}
                  className="px-4 py-2 text-xs font-medium rounded-xl border border-[var(--border-default)] text-[var(--foreground-muted)] hover:bg-[var(--surface-subtle)] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingMetadata}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-xs disabled:opacity-50"
                >
                  {savingMetadata ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
