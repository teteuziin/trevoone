"use client";

import React, { useState, useEffect, useTransition } from "react";
import type {
  WorkoutBlockItemDto,
  ExerciseItemDto,
} from "@/lib/training-v2/types";
import { searchExercisesForPickerAction } from "@/app/consultoria/[slug]/rotinas/actions";

export type MethodType = "BI_SET" | "TRI_SET" | "SUPERSET" | "CIRCUIT";

interface MethodModalProps {
  isOpen: boolean;
  onClose: () => void;
  method: MethodType;
  consultancySlug: string;
  existingItems: WorkoutBlockItemDto[];
  onConfirm: (method: MethodType, itemPublicIds: string[]) => Promise<void>;
  onAddExerciseToBlock: (exercisePublicId: string) => Promise<WorkoutBlockItemDto | null>;
}

const METHOD_CONFIG: Record<
  MethodType,
  { label: string; count: number; desc: string; icon: string; badgeClass: string }
> = {
  BI_SET: {
    label: "Bi-set",
    count: 2,
    desc: "2 exercícios executados em sequência para o mesmo grupo muscular.",
    icon: "⚡",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
  },
  TRI_SET: {
    label: "Tri-set",
    count: 3,
    desc: "3 exercícios executados seguidamente para o mesmo grupo ou sinergistas.",
    icon: "⚡",
    badgeClass: "bg-purple-50 text-purple-700 border-purple-200",
  },
  SUPERSET: {
    label: "Supersérie",
    count: 2,
    desc: "2 exercícios combinados para grupos musculares opostos/antagônicos sem intervalo.",
    icon: "⚡",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  CIRCUIT: {
    label: "Circuito",
    count: 3,
    desc: "Sequência contínua de exercícios ou estações com repetições ou tempo determinado.",
    icon: "🔄",
    badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
  },
};

export function MethodModal({
  isOpen,
  onClose,
  method,
  consultancySlug,
  existingItems,
  onConfirm,
  onAddExerciseToBlock,
}: MethodModalProps) {
  const config = METHOD_CONFIG[method] || METHOD_CONFIG.BI_SET;
  const neededCount = config.count;

  // Selected slots (each slot has publicId and displayName)
  const [slots, setSlots] = useState<
    Array<{ publicId: string; name: string; muscle?: string; isSuggestion?: boolean } | null>
  >(() => {
    const availableExisting = existingItems.filter((i) => !i.combinationPublicId);
    const initialSlots: Array<{
      publicId: string;
      name: string;
      muscle?: string;
      isSuggestion?: boolean;
    } | null> = Array.from({ length: neededCount }).map(() => null);

    availableExisting.slice(0, neededCount).forEach((item, idx) => {
      initialSlots[idx] = {
        publicId: item.publicId,
        name: item.exerciseNameSnapshot,
        muscle: item.muscleGroupSnapshot || undefined,
        isSuggestion: false,
      };
    });

    return initialSlots;
  });

  const [activeSlotIndex, setActiveSlotIndex] = useState<number>(() => {
    const availableExisting = existingItems.filter((i) => !i.combinationPublicId);
    const filledCount = Math.min(availableExisting.length, neededCount);
    return filledCount < neededCount ? filledCount : 0;
  });

  const [activeTab, setActiveTab] = useState<"library" | "existing">(() => {
    const availableExisting = existingItems.filter((i) => !i.combinationPublicId);
    return availableExisting.length > 0 ? "existing" : "library";
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ExerciseItemDto[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [, startTransition] = useTransition();

  // Search exercises in library
  useEffect(() => {
    if (!isOpen) return;
    let isCancelled = false;

    async function fetchExercises() {
      setIsSearching(true);
      try {
        const res = await searchExercisesForPickerAction(consultancySlug, {
          query: searchQuery.trim() || undefined,
        });
        if (!isCancelled && res.ok && res.data) {
          setSearchResults(res.data.slice(0, 8));
        }
      } catch (err) {
        console.error("Erro na busca de exercícios:", err);
      } finally {
        if (!isCancelled) setIsSearching(false);
      }
    }

    const timer = setTimeout(fetchExercises, 200);
    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [isOpen, consultancySlug, searchQuery]);

  if (!isOpen) return null;

  // Handle selecting an existing exercise for the active slot
  const handleSelectExisting = (item: WorkoutBlockItemDto) => {
    setSlots((prev) => {
      const next = [...prev];
      next[activeSlotIndex] = {
        publicId: item.publicId,
        name: item.exerciseNameSnapshot,
        muscle: item.muscleGroupSnapshot || undefined,
        isSuggestion: false,
      };
      return next;
    });

    // Advance to next empty slot
    const nextEmpty = slots.findIndex((s, idx) => idx !== activeSlotIndex && s === null);
    if (nextEmpty !== -1) {
      setActiveSlotIndex(nextEmpty);
    }
  };

  // Handle selecting from library: adds exercise item to block and fills slot
  const handleSelectFromLibrary = async (ex: ExerciseItemDto) => {
    setIsSubmitting(true);
    try {
      const addedItem = await onAddExerciseToBlock(ex.publicId);
      if (addedItem) {
        setSlots((prev) => {
          const next = [...prev];
          next[activeSlotIndex] = {
            publicId: addedItem.publicId,
            name: addedItem.exerciseNameSnapshot,
            muscle: addedItem.muscleGroupSnapshot || undefined,
            isSuggestion: false,
          };
          return next;
        });

        // Advance to next empty slot
        const nextEmpty = slots.findIndex((s, idx) => idx !== activeSlotIndex && s === null);
        if (nextEmpty !== -1) {
          setActiveSlotIndex(nextEmpty);
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle AI suggestion: loads a suggested pair/trio clearly labeled as suggestion
  const handleApplyAiSuggestion = async () => {
    setIsSubmitting(true);
    try {
      const res = await searchExercisesForPickerAction(consultancySlug, {});
      if (res.ok && res.data && res.data.length >= neededCount) {
        const newSlots: Array<{
          publicId: string;
          name: string;
          muscle?: string;
          isSuggestion?: boolean;
        } | null> = [];

        for (let i = 0; i < neededCount; i++) {
          const ex = res.data[i];
          const added = await onAddExerciseToBlock(ex.publicId);
          if (added) {
            newSlots.push({
              publicId: added.publicId,
              name: added.exerciseNameSnapshot,
              muscle: added.muscleGroupSnapshot || undefined,
              isSuggestion: true, // Marked explicitly as AI suggestion requiring approval
            });
          }
        }

        setSlots(newSlots);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClearSlot = (slotIdx: number) => {
    setSlots((prev) => {
      const next = [...prev];
      next[slotIdx] = null;
      return next;
    });
    setActiveSlotIndex(slotIdx);
  };

  const isComplete = slots.every((s) => s !== null);
  const hasSuggestions = slots.some((s) => s?.isSuggestion);

  const handleConfirmMethod = () => {
    if (!isComplete) return;
    const itemIds = slots.map((s) => s!.publicId);
    startTransition(async () => {
      await onConfirm(method, itemIds);
      onClose();
    });
  };

  const getSlotLetter = (idx: number) => String.fromCharCode(65 + idx);

  // Filter uncombined existing items not already in another slot
  const unselectedExisting = existingItems.filter(
    (item) => !item.combinationPublicId && !slots.some((s) => s?.publicId === item.publicId)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[90vh] sm:max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#E5E8E2] flex items-center justify-between gap-3 bg-[#FAFBF9]">
          <div className="flex items-center gap-2.5">
            <span
              className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-black border shadow-2xs ${config.badgeClass}`}
            >
              {config.icon}
            </span>
            <div>
              <h2 className="text-base font-extrabold text-[#102E23]">
                Montar {config.label}
              </h2>
              <p className="text-xs text-[#526058]">{config.desc}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#F5F5F0] hover:bg-[#EAEFEA] text-[#526058] flex items-center justify-center transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {/* Alerta de sugestão da IA se aplicável */}
          {hasSuggestions && (
            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 font-medium flex items-center justify-between gap-2">
              <span>
                ✨ <strong>Sugestão da IA carregada.</strong> Revise os exercícios abaixo antes de aprovar.
              </span>
            </div>
          )}

          {/* Slots Visual Display */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B7870]">
              Posições do {config.label} ({slots.filter(Boolean).length}/{neededCount} preenchidas)
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {slots.map((slot, idx) => {
                const isActive = activeSlotIndex === idx;
                const letter = getSlotLetter(idx);

                return (
                  <div
                    key={idx}
                    onClick={() => setActiveSlotIndex(idx)}
                    className={`p-3 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between gap-2 ${
                      isActive
                        ? "border-[#176B49] bg-[#F0F5F2]"
                        : slot
                        ? "border-[#D5E2D7] bg-white"
                        : "border-dashed border-[#D5E2D7] bg-[#FAFBF9] hover:bg-[#F5F5F0]"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <span
                        className={`w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center shrink-0 ${
                          slot ? config.badgeClass : "bg-[#F0F2ED] text-[#6B7870]"
                        }`}
                      >
                        {letter}
                      </span>

                      <div className="min-w-0 flex-1">
                        {slot ? (
                          <>
                            <p className="text-xs font-bold text-[#102E23] truncate">
                              {slot.name}
                            </p>
                            {slot.isSuggestion && (
                              <span className="text-[10px] text-emerald-700 font-semibold">
                                Sugestão da IA
                              </span>
                            )}
                          </>
                        ) : (
                          <p className="text-xs font-semibold text-[#6B7870]">
                            {isActive ? "Selecionando..." : `Escolher exercício ${letter}`}
                          </p>
                        )}
                      </div>
                    </div>

                    {slot && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleClearSlot(idx);
                        }}
                        className="text-[11px] font-bold text-[#DC2626] hover:underline shrink-0 p-1 cursor-pointer"
                        title="Remover da posição"
                      >
                        Trocar
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Atalho Inteligente: Sugestão da IA */}
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleApplyAiSuggestion}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-[#E8F0EA] border border-[#E5E8E2] text-xs font-bold text-[#176B49] shadow-2xs transition-colors cursor-pointer"
            >
              <span>✨ Sugerir com IA</span>
              <span className="text-[10px] text-[#526058] font-normal">(Requer aprovação)</span>
            </button>
          </div>

          {/* Área de Seleção para o Slot Ativo */}
          <div className="space-y-3 pt-2 border-t border-[#F0F2ED]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-[#102E23]">
                Escolha para a Posição {getSlotLetter(activeSlotIndex)}:
              </span>

              <div className="flex items-center gap-1 bg-[#F5F5F0] p-0.5 rounded-xl text-xs">
                {unselectedExisting.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveTab("existing")}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      activeTab === "existing"
                        ? "bg-white text-[#102E23] shadow-2xs"
                        : "text-[#526058]"
                    }`}
                  >
                    Desta divisão ({unselectedExisting.length})
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setActiveTab("library")}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    activeTab === "library"
                      ? "bg-white text-[#102E23] shadow-2xs"
                      : "text-[#526058]"
                  }`}
                >
                  Biblioteca geral
                </button>
              </div>
            </div>

            {/* Tab 1: Exercícios já existentes nesta divisão */}
            {activeTab === "existing" && unselectedExisting.length > 0 && (
              <div className="divide-y divide-[#F0F2ED] border border-[#F0F2ED] rounded-2xl overflow-hidden bg-white max-h-48 overflow-y-auto">
                {unselectedExisting.map((item) => (
                  <div
                    key={item.publicId}
                    onClick={() => handleSelectExisting(item)}
                    className="p-3 flex items-center justify-between gap-3 hover:bg-[#F5F5F0] transition-colors cursor-pointer group"
                  >
                    <span className="text-xs font-bold text-[#102E23] truncate group-hover:text-[#176B49]">
                      {item.exerciseNameSnapshot}
                    </span>
                    <button
                      type="button"
                      className="px-2.5 py-1 rounded-lg text-xs font-bold bg-[#E8F0EA] text-[#176B49] group-hover:bg-[#176B49] group-hover:text-white transition-colors"
                    >
                      Selecionar
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Tab 2: Buscar na Biblioteca */}
            {activeTab === "library" && (
              <div className="space-y-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar exercício pelo nome..."
                  className="w-full px-3.5 py-2 rounded-xl bg-[#F5F5F0] border border-[#E5E8E2] text-xs text-[#102E23] placeholder-[#6B7870] outline-none shadow-2xs"
                />

                <div className="divide-y divide-[#F0F2ED] border border-[#F0F2ED] rounded-2xl overflow-hidden bg-white max-h-48 overflow-y-auto">
                  {isSearching ? (
                    <div className="p-4 text-center text-xs text-[#526058]">Buscando...</div>
                  ) : searchResults.length === 0 ? (
                    <div className="p-4 text-center text-xs text-[#526058]">Nenhum exercício encontrado.</div>
                  ) : (
                    searchResults.map((ex) => (
                      <div
                        key={ex.publicId}
                        onClick={() => handleSelectFromLibrary(ex)}
                        className="p-3 flex items-center justify-between gap-3 hover:bg-[#F5F5F0] transition-colors cursor-pointer group"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-[#102E23] truncate group-hover:text-[#176B49]">
                            {ex.name}
                          </p>
                          {ex.muscleGroupPrimary && (
                            <span className="text-[10px] text-[#176B49] font-medium">
                              {ex.muscleGroupPrimary}
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          disabled={isSubmitting}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold bg-[#E8F0EA] text-[#176B49] group-hover:bg-[#176B49] group-hover:text-white transition-colors"
                        >
                          + Adicionar à Posição {getSlotLetter(activeSlotIndex)}
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[#E5E8E2] bg-[#FAFBF9] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-[#526058] hover:text-[#102E23] cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            disabled={!isComplete || isSubmitting}
            onClick={handleConfirmMethod}
            className="px-6 py-2.5 rounded-xl text-xs font-bold bg-[#176B49] hover:bg-[#102E23] disabled:opacity-40 text-white shadow-xs transition-colors cursor-pointer min-h-[44px]"
          >
            {hasSuggestions
              ? `Aprovar e Criar ${config.label}`
              : `Confirmar e Criar ${config.label}`}
          </button>
        </div>
      </div>
    </div>
  );
}
