"use client";

import { useState, useEffect, useRef, useTransition, useMemo, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import type {
  WorkoutBlockItemDto,
  WorkoutCombinationType,
  ExerciseItemDto,
} from "@/lib/training-v2/types";
import { searchExercisesForPickerAction } from "@/app/consultoria/[slug]/rotinas/actions";
import {
  getCombinationTheme,
  STUDIO_COMBINATION_TYPE_LABELS,
} from "./training-studio-tokens";
import type { CustomExerciseFormData } from "./custom-exercise-inline-modal";

const emptySubscribe = () => () => {};

function useIsMounted() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}

function getItemPrescriptionSummary(item: WorkoutBlockItemDto) {
  const sets = item.sets || [];
  const seriesCount = sets.length > 0 ? sets.length : 3;
  const firstSet = sets[0];
  const reps = firstSet?.targetReps ?? 10;
  const repsMax = firstSet?.targetRepsMax ?? null;
  const repsText = repsMax != null ? `${reps}-${repsMax} reps` : `${reps} reps`;
  const loadKg = firstSet?.targetLoadKg ?? null;
  const restSeconds = firstSet?.targetRestSeconds ?? 60;
  return {
    seriesCount,
    repsText,
    loadKg,
    restSeconds,
  };
}

const SUPPORTED_COMBINATION_TYPES: Array<{
  type: WorkoutCombinationType;
  label: string;
  memberCount: number;
}> = [
  { type: "BI_SET", label: "Bi-set", memberCount: 2 },
  { type: "TRI_SET", label: "Tri-set", memberCount: 3 },
  { type: "CIRCUIT", label: "Circuito", memberCount: 4 },
  { type: "SUPERSET", label: "Super-série", memberCount: 2 },
];

export type GuidedCombinationModalProps = {
  isOpen: boolean;
  onClose: () => void;
  type?: WorkoutCombinationType;
  categoryPublicId?: string;
  _categoryPublicId?: string;
  initialItem?: WorkoutBlockItemDto | null;
  categoryItems: WorkoutBlockItemDto[];
  consultancySlug: string;
  onConfirmCombination: (
    type: WorkoutCombinationType,
    itemPublicIds: string[],
    rounds: number,
    restSeconds: number
  ) => Promise<void>;
  onAddAndCombineItem?: (exercisePublicId: string) => Promise<WorkoutBlockItemDto | null>;
  onCreateCustomAndCombineItem?: (data: CustomExerciseFormData) => Promise<WorkoutBlockItemDto | null>;
  onDeleteTemporaryItem?: (itemPublicId: string) => Promise<void>;
};

export function GuidedCombinationModal({
  isOpen,
  onClose,
  type = "BI_SET",
  categoryPublicId,
  _categoryPublicId,
  initialItem,
  categoryItems,
  consultancySlug,
  onConfirmCombination,
  onAddAndCombineItem,
  onCreateCustomAndCombineItem,
  onDeleteTemporaryItem,
}: GuidedCombinationModalProps) {
  void categoryPublicId;
  void _categoryPublicId;

  const isMounted = useIsMounted();

  const [prevPropType, setPrevPropType] = useState(type);
  const [selectedType, setSelectedType] = useState<WorkoutCombinationType>(type);

  if (prevPropType !== type) {
    setPrevPropType(type);
    setSelectedType(type);
  }

  const theme = getCombinationTheme(selectedType);
  const typeLabel = STUDIO_COMBINATION_TYPE_LABELS[selectedType] || "Combinação";

  // Required member count by type
  const requiredCount = useMemo(() => {
    switch (selectedType) {
      case "BI_SET":
      case "SUPERSET":
        return 2;
      case "TRI_SET":
        return 3;
      case "CIRCUIT":
      case "GIANT_SET":
        return 4;
      default:
        return 2;
    }
  }, [selectedType]);

  const initialSummary = initialItem ? getItemPrescriptionSummary(initialItem) : null;

  // Selected items: item 0 can be initialItem if provided
  const [selectedItems, setSelectedItems] = useState<
    Array<{ publicId: string; name: string; prescription?: string }>
  >(() => {
    if (!initialItem || !initialSummary) return [];
    return [
      {
        publicId: initialItem.publicId,
        name: initialItem.exerciseNameSnapshot,
        prescription: `${initialSummary.seriesCount} séries · ${initialSummary.repsText}${
          initialSummary.loadKg != null ? ` · ${initialSummary.loadKg}kg` : ""
        }`,
      },
    ];
  });

  const [activeTab, setActiveTab] = useState<"existing" | "library">("existing");
  const [searchQuery, setSearchQuery] = useState("");
  const [libraryExercises, setLibraryExercises] = useState<ExerciseItemDto[]>([]);
  const [isSearching, startSearchTransition] = useTransition();

  const [viewMode, setViewMode] = useState<"SELECT" | "CREATE_CUSTOM">("SELECT");
  const [createdItemIdsDuringSession, setCreatedItemIdsDuringSession] = useState<string[]>([]);

  // Custom Exercise creation states
  const [customName, setCustomName] = useState("");
  const [customMuscle, setCustomMuscle] = useState("");
  const [customEquip, setCustomEquip] = useState("");
  const [customInstructions, setCustomInstructions] = useState("");
  const [customSets, setCustomSets] = useState<number | string>(3);
  const [customReps, setCustomReps] = useState("10-12");
  const [customLoad, setCustomLoad] = useState("");
  const [customRest, setCustomRest] = useState<number | string>(60);
  const [customVideoUrl, setCustomVideoUrl] = useState("");
  const [customNotes, setCustomNotes] = useState("");
  const [customSaveToLibrary, setCustomSaveToLibrary] = useState(false);

  const [rounds, setRounds] = useState(() => initialSummary?.seriesCount || 3);
  const [restSeconds, setRestSeconds] = useState(() => initialSummary?.restSeconds || 60);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filter available existing items in the current block
  // Exclude exercises already selected or already in another combination
  const availableExisting = useMemo(() => {
    const selectedIds = new Set(selectedItems.map((i) => i.publicId));
    return (categoryItems || []).filter(
      (it) =>
        (!initialItem || it.publicId !== initialItem.publicId) &&
        !selectedIds.has(it.publicId) &&
        !it.combinationPublicId
    );
  }, [categoryItems, initialItem, selectedItems]);

  // Search library
  useEffect(() => {
    if (activeTab !== "library" || !isOpen) return;

    let active = true;
    startSearchTransition(async () => {
      try {
        const res = await searchExercisesForPickerAction(consultancySlug, {
          source: "TODOS",
          query: searchQuery.trim() || undefined,
        });
        if (active && res.ok && res.data) {
          setLibraryExercises(res.data);
        } else if (active) {
          setLibraryExercises([]);
        }
      } catch {
        if (active) setLibraryExercises([]);
      }
    });

    return () => {
      active = false;
    };
  }, [activeTab, searchQuery, consultancySlug, isOpen]);

  const handleCloseRef = useRef(handleCloseAndCleanup);
  useEffect(() => {
    handleCloseRef.current = handleCloseAndCleanup;
  });

  // Lock body scroll and handle Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        handleCloseRef.current();
      }
    }
    if (isOpen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
      return () => {
        document.body.style.overflow = prevOverflow;
        window.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [isOpen]);

  if (!isOpen || !isMounted) return null;

  const currentStep = selectedItems.length;
  const isPreviewStep = selectedItems.length >= requiredCount;
  const currentLetter = String.fromCharCode(65 + selectedItems.length); // Next letter to pick (A, B, C, etc.)

  function handleSelectExisting(item: WorkoutBlockItemDto) {
    const summary = getItemPrescriptionSummary(item);
    setSelectedItems((prev) => [
      ...prev,
      {
        publicId: item.publicId,
        name: item.exerciseNameSnapshot,
        prescription: `${summary.seriesCount} séries · ${summary.repsText}${
          summary.loadKg != null ? ` · ${summary.loadKg}kg` : ""
        }`,
      },
    ]);
  }

  async function handleSelectFromLibrary(ex: ExerciseItemDto) {
    if (!onAddAndCombineItem) {
      setErrorMessage("Adição pela biblioteca não disponível neste contexto.");
      return;
    }
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const added = await onAddAndCombineItem(ex.publicId);
      if (added) {
        setCreatedItemIdsDuringSession((prev) => [...prev, added.publicId]);
        setSelectedItems((prev) => [
          ...prev,
          {
            publicId: added.publicId,
            name: added.exerciseNameSnapshot,
            prescription: "10 repetições",
          },
        ]);
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Erro ao adicionar exercício.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCreateCustomSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!customName.trim()) {
      setErrorMessage("O nome do exercício é obrigatório.");
      return;
    }
    if (!onCreateCustomAndCombineItem) {
      setErrorMessage("Criação de exercícios personalizados não disponível neste contexto.");
      return;
    }
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const added = await onCreateCustomAndCombineItem({
        type: "EXERCISE",
        name: customName.trim(),
        muscleGroup: customMuscle.trim() || undefined,
        equipment: customEquip.trim() || undefined,
        instructions: customInstructions.trim() || undefined,
        sets: Number(customSets) || 3,
        reps: customReps.trim() || "10-12",
        load: customLoad.trim() || undefined,
        restSeconds: Number(customRest) || 60,
        videoUrl: customVideoUrl.trim() || undefined,
        notes: customNotes.trim() || undefined,
        saveToMyLibrary: customSaveToLibrary,
      });

      if (added) {
        setCreatedItemIdsDuringSession((prev) => [...prev, added.publicId]);
        setSelectedItems((prev) => [
          ...prev,
          {
            publicId: added.publicId,
            name: added.exerciseNameSnapshot,
            prescription: `${customSets} séries · ${customReps}${customLoad ? ` · ${customLoad}kg` : ""}`,
          },
        ]);
        setViewMode("SELECT");
      } else {
        setErrorMessage("Não foi possível criar o exercício personalizado.");
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Erro ao criar exercício.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleRemoveItem(idx: number) {
    if (initialItem && idx === 0) return; // Cannot remove initialItem member A
    setSelectedItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleOpenCreateCustom() {
    setCustomName("");
    setCustomMuscle("");
    setCustomEquip("");
    setCustomInstructions("");
    setCustomSets(3);
    setCustomReps("10-12");
    setCustomLoad("");
    setCustomRest(60);
    setCustomVideoUrl("");
    setCustomNotes("");
    setCustomSaveToLibrary(false);
    setErrorMessage(null);
    setViewMode("CREATE_CUSTOM");
  }

  async function handleCloseAndCleanup() {
    if (isSubmitting) return;
    if (createdItemIdsDuringSession.length > 0 && onDeleteTemporaryItem) {
      try {
        await Promise.all(createdItemIdsDuringSession.map((id) => onDeleteTemporaryItem(id)));
      } catch {
        // Silently catch cleanup errors
      }
    }
    setViewMode("SELECT");
    onClose();
  }

  async function handleConfirm() {
    if (selectedItems.length < requiredCount || isSubmitting) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const itemIds = selectedItems.map((i) => i.publicId);
      await onConfirmCombination(selectedType, itemIds, rounds, restSeconds);
      setCreatedItemIdsDuringSession([]);
      onClose();
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Erro ao criar combinação de exercícios."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="guided-combination-title"
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        className="w-full max-w-lg rounded-3xl bg-[var(--surface)] border border-[var(--border-default)] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-[var(--text-primary)] animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div
          className={`p-4 sm:p-5 border-b border-[var(--border-subtle)] ${theme.headerBgClass} flex items-center justify-between gap-3 shrink-0`}
        >
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider ${theme.badgeClass}`}>
                {typeLabel}
              </span>
              <span className="text-xs font-bold text-[var(--text-secondary)]">
                {isPreviewStep ? "Prévia da Combinação" : `Passo ${currentStep + 1} de ${requiredCount}`}
              </span>
            </div>
            <h3
              id="guided-combination-title"
              className="text-base sm:text-lg font-black tracking-tight text-[var(--text-primary)] truncate"
            >
              {isPreviewStep
                ? `Confirmar ${typeLabel}`
                : initialItem
                ? `Criar ${typeLabel} com ${initialItem.exerciseNameSnapshot}`
                : `Criar ${typeLabel}`}
            </h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              {isPreviewStep
                ? "Revise os exercícios, voltas e tempo de descanso antes de salvar."
                : `Selecione o exercício para o membro ${currentLetter} da combinação.`}
            </p>
          </div>
          <button
            type="button"
            onClick={handleCloseAndCleanup}
            aria-label="Fechar modal de combinação"
            className="w-9 h-9 min-h-[44px] min-w-[44px] rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            ✕
          </button>
        </div>

        {/* Combination Type Selector Tabs (Visible when starting without preselected item) */}
        {!initialItem && selectedItems.length < 2 && (
          <div className="p-3 bg-[var(--surface-subtle)]/70 border-b border-[var(--border-subtle)] shrink-0">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
              Tipo de Combinação:
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {SUPPORTED_COMBINATION_TYPES.map((t) => {
                const isSelected = selectedType === t.type;
                const typeTheme = getCombinationTheme(t.type);
                return (
                  <button
                    key={t.type}
                    type="button"
                    onClick={() => {
                      setSelectedType(t.type);
                      setErrorMessage(null);
                    }}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 min-h-[44px] border ${
                      isSelected
                        ? `${typeTheme.selectorActiveClass} font-black`
                        : "bg-[var(--surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border-[var(--border-subtle)] hover:bg-[var(--surface-hover)]"
                    }`}
                  >
                    <span>{t.label}</span>
                    <span className="text-[10px] opacity-75">{t.memberCount} membros</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Selected Members Summary (A, B, C...) */}
        <div className="p-4 bg-[var(--surface-subtle)]/40 border-b border-[var(--border-subtle)] space-y-2 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
              Membros Selecionados ({selectedItems.length}/{requiredCount}):
            </span>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
              {isPreviewStep ? "Composição completa ✓" : `Falta ${requiredCount - selectedItems.length}`}
            </span>
          </div>

          <div className="space-y-1.5">
            {selectedItems.map((it, idx) => (
              <div
                key={it.publicId}
                className="flex items-center justify-between gap-2.5 p-2 rounded-xl bg-[var(--surface)] border border-[var(--border-subtle)]"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <span
                    className={`w-7 h-7 rounded-lg ${theme.letterAvatarClass} text-xs font-black flex items-center justify-center shrink-0`}
                  >
                    {String.fromCharCode(65 + idx)}.
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm font-bold text-[var(--text-primary)] truncate">
                      {it.name}
                    </p>
                    {it.prescription && (
                      <p className="text-[10px] sm:text-xs text-[var(--text-secondary)] truncate">
                        {it.prescription}
                      </p>
                    )}
                  </div>
                </div>
                {(!initialItem || idx > 0) && !isSubmitting && (
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(idx)}
                    aria-label={`Remover exercício ${it.name}`}
                    className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 text-xs font-bold transition-colors cursor-pointer min-h-[36px]"
                  >
                    Remover
                  </button>
                )}
              </div>
            ))}

            {!isPreviewStep && (
              <div className="flex items-center gap-2.5 p-2 rounded-xl border border-dashed border-[var(--border-strong)] bg-transparent text-[var(--text-secondary)]">
                <span className="w-7 h-7 rounded-lg border border-dashed border-[var(--border-strong)] text-xs flex items-center justify-center shrink-0 font-bold">
                  {currentLetter}.
                </span>
                <span className="text-xs font-semibold">
                  Selecione o exercício {currentLetter} abaixo...
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs font-bold">
              {errorMessage}
            </div>
          )}

          {!isPreviewStep ? (
            viewMode === "CREATE_CUSTOM" ? (
              /* Inline Custom Exercise Creation */
              <form onSubmit={handleCreateCustomSubmit} className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
                  <div className="flex items-center gap-2">
                    <span className={`w-6 h-6 rounded-md ${theme.letterAvatarClass} text-xs font-black flex items-center justify-center shrink-0`}>
                      {currentLetter}
                    </span>
                    <h4 className="text-xs sm:text-sm font-bold text-[var(--text-primary)]">
                      Criar Exercício Personalizado (Membro {currentLetter})
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => setViewMode("SELECT")}
                    className="text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                  >
                    ← Voltar à seleção
                  </button>
                </div>

                {/* 1. Exercício */}
                <div className="space-y-2.5">
                  <div className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--text-secondary)]">
                    1. Exercício
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                      Nome do Exercício <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      placeholder="Ex: Supino Inclinado com Halteres Pegada Neutra"
                      className="w-full px-3 py-2 text-xs sm:text-sm font-medium rounded-xl border border-[var(--border-default)] bg-[var(--surface)] text-[var(--text-primary)] focus:ring-2 focus:ring-emerald-500 focus:outline-none min-h-[42px]"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                        Grupo Muscular
                      </label>
                      <input
                        type="text"
                        value={customMuscle}
                        onChange={(e) => setCustomMuscle(e.target.value)}
                        placeholder="Ex: Peitoral, Tríceps"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border-default)] bg-[var(--surface)] text-[var(--text-primary)] focus:ring-2 focus:ring-emerald-500 focus:outline-none min-h-[38px]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                        Equipamento
                      </label>
                      <input
                        type="text"
                        value={customEquip}
                        onChange={(e) => setCustomEquip(e.target.value)}
                        placeholder="Ex: Halteres, Banco Inclinado"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border-default)] bg-[var(--surface)] text-[var(--text-primary)] focus:ring-2 focus:ring-emerald-500 focus:outline-none min-h-[38px]"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Prescrição */}
                <div className="space-y-2.5 pt-2 border-t border-[var(--border-subtle)]">
                  <div className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--text-secondary)]">
                    2. Prescrição
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Séries</label>
                      <input
                        type="number"
                        min={1}
                        max={20}
                        value={customSets}
                        onChange={(e) => setCustomSets(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border-default)] bg-[var(--surface)] text-[var(--text-primary)] min-h-[38px]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Repetições</label>
                      <input
                        type="text"
                        value={customReps}
                        onChange={(e) => setCustomReps(e.target.value)}
                        placeholder="Ex: 10-12"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border-default)] bg-[var(--surface)] text-[var(--text-primary)] min-h-[38px]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Carga (kg)</label>
                      <input
                        type="text"
                        value={customLoad}
                        onChange={(e) => setCustomLoad(e.target.value)}
                        placeholder="Opcional"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border-default)] bg-[var(--surface)] text-[var(--text-primary)] min-h-[38px]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Descanso (s)</label>
                      <input
                        type="number"
                        min={0}
                        step={5}
                        value={customRest}
                        onChange={(e) => setCustomRest(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border-default)] bg-[var(--surface)] text-[var(--text-primary)] min-h-[38px]"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Demonstração e Opcionais */}
                <div className="space-y-2.5 pt-2 border-t border-[var(--border-subtle)]">
                  <div className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--text-secondary)]">
                    3. Demonstração e Opcionais
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                      Link do Vídeo (YouTube, Vimeo ou MP4)
                    </label>
                    <input
                      type="url"
                      value={customVideoUrl}
                      onChange={(e) => setCustomVideoUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border-default)] bg-[var(--surface)] text-[var(--text-primary)] min-h-[38px]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                      Orientações Técnicas (opcional)
                    </label>
                    <textarea
                      rows={2}
                      value={customNotes}
                      onChange={(e) => setCustomNotes(e.target.value)}
                      placeholder="Orientações de postura, execução ou cadência..."
                      className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border-default)] bg-[var(--surface)] text-[var(--text-primary)] resize-none"
                    />
                  </div>
                  <label className="flex items-start gap-2.5 pt-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={customSaveToLibrary}
                      onChange={(e) => setCustomSaveToLibrary(e.target.checked)}
                      className="mt-0.5 rounded border-[var(--border-default)] text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-xs text-[var(--text-secondary)]">
                      Salvar também na Minha Biblioteca para reutilizar em outros treinos
                    </span>
                  </label>
                </div>

                {/* Form Actions */}
                <div className="pt-2 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setViewMode("SELECT")}
                    className="py-2 px-3 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] min-h-[40px] cursor-pointer"
                  >
                    Cancelar e Voltar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !customName.trim()}
                    className="py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors min-h-[40px] cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {isSubmitting ? "Criando..." : `Usar como membro ${currentLetter}`}
                  </button>
                </div>
              </form>
            ) : (
              /* Picker Step */
              <div className="space-y-3">
                {/* Tab Selector + Discrete Create Custom */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] flex-1">
                    <button
                      type="button"
                      onClick={() => setActiveTab("existing")}
                      className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer min-h-[38px] ${
                        activeTab === "existing"
                          ? "bg-[var(--surface)] text-[var(--text-primary)] shadow-xs"
                          : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      }`}
                    >
                      Deste bloco ({availableExisting.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("library")}
                      className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer min-h-[38px] ${
                        activeTab === "library"
                          ? "bg-[var(--surface)] text-[var(--text-primary)] shadow-xs"
                          : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      }`}
                    >
                      Biblioteca
                    </button>
                  </div>
                  {onCreateCustomAndCombineItem && (
                    <button
                      type="button"
                      onClick={handleOpenCreateCustom}
                      className="inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-dashed border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 text-xs font-bold transition-colors cursor-pointer min-h-[38px]"
                    >
                      <span>+</span>
                      <span>Criar personalizado</span>
                    </button>
                  )}
                </div>

                {activeTab === "existing" ? (
                  /* Existing Items in Category */
                  <div className="space-y-2">
                    <p className="text-xs text-[var(--text-secondary)] font-medium">
                      Toque em um exercício para adicionar como membro {currentLetter}:
                    </p>
                    {availableExisting.length === 0 ? (
                      <div className="py-8 text-center text-xs text-[var(--text-secondary)] space-y-2 bg-[var(--surface-subtle)]/30 rounded-2xl p-4">
                        <p className="font-semibold text-[var(--text-primary)]">
                          Nenhum outro exercício solto neste bloco.
                        </p>
                        <p>Use a aba &quot;Biblioteca&quot; ou clique em &quot;Criar personalizado&quot; acima.</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                        {availableExisting.map((ex) => {
                          const sum = getItemPrescriptionSummary(ex);
                          return (
                            <button
                              key={ex.publicId}
                              type="button"
                              onClick={() => handleSelectExisting(ex)}
                              className="w-full p-3 rounded-xl border border-[var(--border-subtle)] hover:border-emerald-500 bg-[var(--surface)] hover:bg-[var(--surface-hover)] flex items-center justify-between gap-3 text-left transition-all cursor-pointer min-h-[44px] active:scale-[0.99]"
                            >
                              <div className="min-w-0 flex-1">
                                <h4 className="text-xs sm:text-sm font-bold text-[var(--text-primary)] truncate">
                                  {ex.exerciseNameSnapshot}
                                </h4>
                                <p className="text-[10px] sm:text-xs text-[var(--text-secondary)]">
                                  {sum.seriesCount} séries · {sum.repsText}
                                  {sum.loadKg != null ? ` · ${sum.loadKg}kg` : ""}
                                </p>
                              </div>
                              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                                + Escolher {currentLetter}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  /* Library Search */
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Digite para buscar exercício..."
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-medium rounded-xl border border-[var(--border-default)] bg-[var(--surface)] text-[var(--text-primary)] focus:ring-2 focus:ring-emerald-500 focus:outline-none min-h-[44px]"
                    />
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {isSearching ? (
                        <p className="py-6 text-center text-xs text-[var(--text-secondary)]">Buscando na biblioteca...</p>
                      ) : libraryExercises.length === 0 ? (
                        <p className="py-6 text-center text-xs text-[var(--text-secondary)]">
                          {searchQuery ? "Nenhum exercício encontrado." : "Digite o nome de um exercício para pesquisar."}
                        </p>
                      ) : (
                        libraryExercises.map((lex) => (
                          <button
                            key={lex.publicId}
                            type="button"
                            disabled={isSubmitting}
                            onClick={() => handleSelectFromLibrary(lex)}
                            className="w-full p-3 rounded-xl border border-[var(--border-subtle)] hover:border-emerald-500 bg-[var(--surface)] hover:bg-[var(--surface-hover)] flex items-center justify-between gap-3 text-left transition-all cursor-pointer min-h-[44px] disabled:opacity-50 active:scale-[0.99]"
                          >
                            <div className="min-w-0 flex-1">
                              <h4 className="text-xs sm:text-sm font-bold text-[var(--text-primary)] truncate">
                                {lex.name}
                              </h4>
                              <p className="text-[10px] sm:text-xs text-[var(--text-secondary)]">
                                {lex.muscleGroupPrimary || "Geral"} {lex.equipment ? `· ${lex.equipment}` : ""}
                              </p>
                            </div>
                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                              + Adicionar {currentLetter}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          ) : (
            /* Preview Step: Confirm configuration */
            <div className="space-y-4">
              <div className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                Configuração da Prescrição Coletiva
              </div>
              <div className="p-4 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-4">
                {/* Steppers for rounds & rest */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <label className="text-xs font-bold text-[var(--text-primary)] block">
                      Voltas / Rodadas da combinação
                    </label>
                    <span className="text-[11px] text-[var(--text-secondary)]">
                      Executar a sequência de {selectedItems.length} exercícios sem pausa
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setRounds((r) => Math.max(1, r - 1))}
                      className="w-9 h-9 rounded-xl bg-[var(--surface)] border border-[var(--border-default)] font-black text-sm flex items-center justify-center cursor-pointer min-h-[36px] min-w-[36px] active:scale-[0.98]"
                    >
                      -
                    </button>
                    <span className="w-8 text-center font-black text-sm text-[var(--text-primary)]">
                      {rounds}
                    </span>
                    <button
                      type="button"
                      onClick={() => setRounds((r) => Math.min(10, r + 1))}
                      className="w-9 h-9 rounded-xl bg-[var(--surface)] border border-[var(--border-default)] font-black text-sm flex items-center justify-center cursor-pointer min-h-[36px] min-w-[36px] active:scale-[0.98]"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 flex-wrap pt-3 border-t border-[var(--border-subtle)]">
                  <div>
                    <label className="text-xs font-bold text-[var(--text-primary)] block">
                      Descanso pós-volta
                    </label>
                    <span className="text-[11px] text-[var(--text-secondary)]">
                      Pausa concedida somente ao concluir a volta completa
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setRestSeconds((s) => Math.max(0, s - 15))}
                      className="w-9 h-9 rounded-xl bg-[var(--surface)] border border-[var(--border-default)] font-black text-sm flex items-center justify-center cursor-pointer min-h-[36px] min-w-[36px] active:scale-[0.98]"
                    >
                      -
                    </button>
                    <span className="w-12 text-center font-black text-sm text-[var(--text-primary)]">
                      {restSeconds}s
                    </span>
                    <button
                      type="button"
                      onClick={() => setRestSeconds((s) => Math.min(600, s + 15))}
                      className="w-9 h-9 rounded-xl bg-[var(--surface)] border border-[var(--border-default)] font-black text-sm flex items-center justify-center cursor-pointer min-h-[36px] min-w-[36px] active:scale-[0.98]"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-[var(--surface-subtle)] border-t border-[var(--border-subtle)] flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={handleCloseAndCleanup}
            disabled={isSubmitting}
            className="py-2.5 px-4 rounded-xl text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer min-h-[44px]"
          >
            Cancelar
          </button>

          {isPreviewStep ? (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleConfirm}
              className={`py-2.5 px-6 rounded-2xl ${theme.selectorActiveClass} font-black text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 min-h-[44px] cursor-pointer disabled:opacity-50`}
            >
              {isSubmitting ? "Criando..." : `Confirmar e Criar ${typeLabel}`}
            </button>
          ) : (
            <span className="text-xs font-semibold text-[var(--text-secondary)]">
              Membros: {currentStep} de {requiredCount}
            </span>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
