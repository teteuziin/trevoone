"use client";

import React, { useMemo, useState, useEffect } from "react";
import type {
  WorkoutBlockDto,
  WorkoutBlockItemDto,
  WorkoutItemCombinationDto,
  ExerciseItemDto,
} from "@/lib/training-v2/types";
import { searchExercisesForPickerAction } from "@/app/consultoria/[slug]/rotinas/actions";
import { ExerciseCard } from "./exercise-card";
import { CombinationCard } from "./combination-card";
import { InsertHereDivider } from "./insert-here-divider";

interface DivisionWorkspaceProps {
  consultancySlug: string;
  block: WorkoutBlockDto;
  onUpdateItemConfig: (itemPublicId: string, updates: {
    setsCount?: number;
    reps?: string;
    loadKg?: number | null;
    restSeconds?: number | null;
    notes?: string;
    tempo?: string;
    rpeTarget?: number | null;
  }) => Promise<void>;
  onMoveItemUp: (itemPublicId: string) => Promise<void>;
  onMoveItemDown: (itemPublicId: string) => Promise<void>;
  onDuplicateItem: (itemPublicId: string) => Promise<void>;
  onDeleteItem: (itemPublicId: string) => Promise<void>;
  onOpenAddModal: (insertIndex?: number) => void;
  onSelectExercise: (exercise: ExerciseItemDto) => Promise<void>;
  onOpenMethodModal: (method: "BI_SET" | "TRI_SET" | "CIRCUIT" | "SUPERSET", insertIndex?: number) => void;
  onOpenModelsDrawer: (insertIndex?: number) => void;
  onOpenAiDrawer: (insertIndex?: number) => void;
  onSwapCombinationOrder: (combinationPublicId: string) => Promise<void>;
  onUngroupCombination: (combinationPublicId: string) => Promise<void>;
  onDuplicateCombination: (combinationPublicId: string) => Promise<void>;
  onDeleteCombination: (combinationPublicId: string) => Promise<void>;
  onAddItemToCombination: (combinationPublicId: string) => void;
  onRemoveItemFromCombination: (combinationPublicId: string, itemPublicId: string) => Promise<void>;
  onCombineWithNext: (itemPublicId: string) => Promise<void>;
}

function PlusIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function SearchIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
  );
}

function ChevronDownIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    </svg>
  );
}

export function DivisionWorkspace({
  consultancySlug,
  block,
  onUpdateItemConfig,
  onMoveItemUp,
  onMoveItemDown,
  onDuplicateItem,
  onDeleteItem,
  onOpenAddModal,
  onSelectExercise,
  onOpenMethodModal,
  onOpenModelsDrawer,
  onOpenAiDrawer,
  onSwapCombinationOrder,
  onUngroupCombination,
  onDuplicateCombination,
  onDeleteCombination,
  onAddItemToCombination,
  onRemoveItemFromCombination,
  onCombineWithNext,
}: DivisionWorkspaceProps) {
  // Empty state search and methods picker state
  const [emptySearchQuery, setEmptySearchQuery] = useState("");
  const [emptySearchResults, setEmptySearchResults] = useState<ExerciseItemDto[]>([]);
  const [isSearchingEmpty, setIsSearchingEmpty] = useState(false);
  const [isMethodDropdownOpen, setIsMethodDropdownOpen] = useState(false);
  const [addingExerciseId, setAddingExerciseId] = useState<string | null>(null);

  // Map combinations to identify items belonging to combinations
  const combinationItemMap = useMemo(() => {
    const map = new Map<string, WorkoutItemCombinationDto>();
    (block.combinations || []).forEach((c) => {
      (c.items || []).forEach((itemOrId) => {
        const id = typeof itemOrId === "string" ? itemOrId : itemOrId.publicId;
        map.set(id, c);
      });
    });
    (block.items || []).forEach((item) => {
      if (item.combinationPublicId) {
        const comb = (block.combinations || []).find((c) => c.publicId === item.combinationPublicId);
        if (comb) map.set(item.publicId, comb);
      }
    });
    return map;
  }, [block.combinations, block.items]);

  // Group items by display entries (standalone items OR combinations)
  const displayEntries = useMemo(() => {
    const entries: Array<
      | { type: "item"; item: WorkoutBlockItemDto; originalIndex: number }
      | {
          type: "combination";
          combination: WorkoutItemCombinationDto;
          items: WorkoutBlockItemDto[];
          originalIndex: number;
        }
    > = [];

    const processedCombIds = new Set<string>();

    (block.items || []).forEach((item, idx) => {
      const comb = combinationItemMap.get(item.publicId);
      if (!comb) {
        entries.push({ type: "item", item, originalIndex: idx });
      } else {
        if (!processedCombIds.has(comb.publicId)) {
          processedCombIds.add(comb.publicId);
          // Find all items belonging to this combination in block order
          const combItems = (block.items || []).filter(
            (it) =>
              it.combinationPublicId === comb.publicId ||
              (comb.items || []).some((ci) =>
                typeof ci === "string" ? ci === it.publicId : ci.publicId === it.publicId
              )
          );
          entries.push({
            type: "combination",
            combination: comb,
            items: combItems,
            originalIndex: idx,
          });
        }
      }
    });

    return entries;
  }, [block.items, combinationItemMap]);

  const isEmpty = !block.items || block.items.length === 0;

  // Real-time exercise search in empty state
  useEffect(() => {
    if (!isEmpty) return;
    let isCancelled = false;

    async function searchExercises() {
      setIsSearchingEmpty(true);
      try {
        const res = await searchExercisesForPickerAction(consultancySlug, {
          query: emptySearchQuery.trim() || undefined,
        });
        if (!isCancelled && res.ok && res.data) {
          // Show top 6 matches
          setEmptySearchResults(res.data.slice(0, 6));
        }
      } catch (err) {
        console.error("Erro na busca direta:", err);
      } finally {
        if (!isCancelled) setIsSearchingEmpty(false);
      }
    }

    const timer = setTimeout(searchExercises, 200);
    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [isEmpty, consultancySlug, emptySearchQuery]);

  // Handle adding exercise from empty state 1-tap
  const handleAddFromEmpty = async (ex: ExerciseItemDto) => {
    setAddingExerciseId(ex.publicId);
    try {
      await onSelectExercise(ex);
    } finally {
      setAddingExerciseId(null);
    }
  };

  // =========================================================================
  // 1. EMPTY STATE REFINADO: Compacto, busca direta integrada, 1 toque para adicionar
  // =========================================================================
  if (isEmpty) {
    return (
      <div className="w-full max-w-2xl mx-auto bg-white border border-[#E5E8E2] rounded-3xl p-5 sm:p-7 shadow-xs space-y-5 animate-in fade-in duration-150">
        {/* Título e Orientação Amigável */}
        <div className="text-center space-y-1">
          <h2 className="text-base sm:text-lg font-extrabold text-[#102E23]">
            Vamos adicionar o primeiro exercício?
          </h2>
          <p className="text-xs sm:text-sm text-[#526058]">
            Digite o nome para buscar na biblioteca ou escolha um método avançado.
          </p>
        </div>

        {/* Barra de Busca Funcional Integrada com 1 Toque */}
        <div className="space-y-3">
          <div className="relative">
            <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6B7870] w-4 h-4 pointer-events-none" />
            <input
              type="text"
              value={emptySearchQuery}
              onChange={(e) => setEmptySearchQuery(e.target.value)}
              placeholder="Buscar exercício..."
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-[#F5F5F0] border border-[#E5E8E2] focus:border-[#176B49] focus:bg-white text-sm text-[#102E23] placeholder-[#6B7870] outline-none transition-all shadow-2xs font-sans"
            />
            {isSearchingEmpty && (
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-[#176B49] animate-pulse">
                Buscando...
              </span>
            )}
          </div>

          {/* Resultados da Busca Direta com 1 Toque */}
          {emptySearchResults.length > 0 && (
            <div className="divide-y divide-[#F0F2ED] border border-[#F0F2ED] rounded-2xl overflow-hidden bg-white max-h-64 overflow-y-auto shadow-2xs">
              {emptySearchResults.map((ex) => (
                <div
                  key={ex.publicId}
                  data-testid="empty-search-exercise-item"
                  onClick={() => handleAddFromEmpty(ex)}
                  className="p-3 sm:px-4 flex items-center justify-between gap-3 hover:bg-[#F5F5F0] transition-colors cursor-pointer group"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm font-bold text-[#102E23] truncate group-hover:text-[#176B49] transition-colors">
                      {ex.name}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {ex.muscleGroupPrimary && (
                        <span className="text-[10px] font-semibold text-[#176B49] bg-[#E8F0EA] px-1.5 py-0.5 rounded-md">
                          {ex.muscleGroupPrimary}
                        </span>
                      )}
                      {ex.equipment && (
                        <span className="text-[10px] text-[#526058]">
                          • {ex.equipment}
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={addingExerciseId === ex.publicId}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddFromEmpty(ex);
                    }}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#E8F0EA] text-[#176B49] group-hover:bg-[#176B49] group-hover:text-white transition-all shrink-0 cursor-pointer shadow-2xs"
                  >
                    {addingExerciseId === ex.publicId ? "Adicionando..." : "+ Adicionar"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Ação Secundária: Escolher Método de Treino (Bi-set, Tri-set, Supersérie, Circuito) */}
        <div className="pt-2 border-t border-[#F0F2ED] flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <div className="relative w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setIsMethodDropdownOpen(!isMethodDropdownOpen)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-[#102E23] bg-[#F5F5F0] hover:bg-[#EAEFEA] border border-[#E5E8E2] transition-colors shadow-2xs cursor-pointer min-h-[38px]"
            >
              <span>⚡ Escolher método de treino</span>
              <ChevronDownIcon />
            </button>

            {isMethodDropdownOpen && (
              <div className="absolute left-0 bottom-full mb-1.5 z-30 w-56 bg-white border border-[#E5E8E2] rounded-2xl shadow-xl p-1.5 space-y-1 animate-in fade-in duration-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsMethodDropdownOpen(false);
                    onOpenMethodModal("BI_SET", 0);
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-[#102E23] hover:bg-[#E8F0EA] hover:text-[#176B49] transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <span>⚡ Bi-set</span>
                  <span className="text-[10px] text-[#526058] font-normal">(2 exercícios)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsMethodDropdownOpen(false);
                    onOpenMethodModal("TRI_SET", 0);
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-[#102E23] hover:bg-[#E8F0EA] hover:text-[#176B49] transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <span>⚡ Tri-set</span>
                  <span className="text-[10px] text-[#526058] font-normal">(3 exercícios)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsMethodDropdownOpen(false);
                    onOpenMethodModal("SUPERSET", 0);
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-[#102E23] hover:bg-[#E8F0EA] hover:text-[#176B49] transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <span>⚡ Supersérie</span>
                  <span className="text-[10px] text-[#526058] font-normal">(antagônicos)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsMethodDropdownOpen(false);
                    onOpenMethodModal("CIRCUIT", 0);
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-[#102E23] hover:bg-[#E8F0EA] hover:text-[#176B49] transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <span>🔄 Circuito</span>
                  <span className="text-[10px] text-[#526058] font-normal">(estações)</span>
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => onOpenAddModal(0)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-[#176B49] hover:bg-[#E8F0EA] transition-colors cursor-pointer"
          >
            <span>Ver biblioteca completa →</span>
          </button>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 2. LISTA PREENCHIDA COM EXERCÍCIOS, COMBINAÇÕES E DIVISORES DE POSIÇÃO EXATA
  // =========================================================================
  return (
    <div className="w-full space-y-2 pb-24">
      {/* Inserção no Início da Divisão */}
      <InsertHereDivider
        insertIndex={0}
        onInsertExercise={(idx) => onOpenAddModal(idx)}
        onInsertMethod={(m, idx) => onOpenMethodModal(m, idx)}
        onInsertFromModel={(idx) => onOpenModelsDrawer(idx)}
        onInsertFromAi={(idx) => onOpenAiDrawer(idx)}
        label="Inserir no início"
      />

      {/* Lista de Itens e Combinações */}
      {displayEntries.map((entry, entryIdx) => {
        const nextInsertIndex = entry.originalIndex + (entry.type === "combination" ? entry.items.length : 1);

        return (
          <React.Fragment key={entry.type === "item" ? entry.item.publicId : entry.combination.publicId}>
            {entry.type === "item" ? (
              <ExerciseCard
                key={entry.item.publicId}
                item={entry.item}
                index={entryIdx}
                totalItems={displayEntries.length}
                onUpdateConfig={onUpdateItemConfig}
                onMoveUp={() => onMoveItemUp(entry.item.publicId)}
                onMoveDown={() => onMoveItemDown(entry.item.publicId)}
                onDuplicate={() => onDuplicateItem(entry.item.publicId)}
                onDelete={() => onDeleteItem(entry.item.publicId)}
                onStartBiSet={() => onCombineWithNext(entry.item.publicId)}
                isFirst={entryIdx === 0}
                isLast={entryIdx === displayEntries.length - 1}
              />
            ) : (
              <CombinationCard
                combination={entry.combination}
                items={entry.items}
                index={entryIdx}
                totalCombinations={displayEntries.length}
                onUpdateConfig={onUpdateItemConfig}
                onSwapOrder={onSwapCombinationOrder}
                onUngroup={onUngroupCombination}
                onDuplicate={onDuplicateCombination}
                onDelete={onDeleteCombination}
                onAddItem={onAddItemToCombination}
                onRemoveItemFromCombination={onRemoveItemFromCombination}
                onMoveUp={() => onMoveItemUp(entry.items[0]?.publicId)}
                onMoveDown={() => onMoveItemDown(entry.items[entry.items.length - 1]?.publicId)}
                isFirst={entryIdx === 0}
                isLast={entryIdx === displayEntries.length - 1}
              />
            )}

            {/* Inserir Aqui entre os itens */}
            <InsertHereDivider
              insertIndex={nextInsertIndex}
              onInsertExercise={(idx) => onOpenAddModal(idx)}
              onInsertMethod={(m, idx) => onOpenMethodModal(m, idx)}
              onInsertFromModel={(idx) => onOpenModelsDrawer(idx)}
              onInsertFromAi={(idx) => onOpenAiDrawer(idx)}
            />
          </React.Fragment>
        );
      })}

      {/* Botão no Fim da Divisão */}
      <div className="pt-2">
        <button
          type="button"
          onClick={() => onOpenAddModal(block.items?.length || 0)}
          className="w-full py-4 px-6 rounded-2xl border-2 border-dashed border-[#D5E2D7] hover:border-[#176B49] bg-white hover:bg-[#E8F0EA]/40 text-[#102E23] hover:text-[#176B49] font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer min-h-[52px]"
        >
          <PlusIcon className="w-5 h-5 text-[#176B49]" />
          <span>+ Adicionar exercício ou bloco</span>
        </button>
      </div>
    </div>
  );
}
