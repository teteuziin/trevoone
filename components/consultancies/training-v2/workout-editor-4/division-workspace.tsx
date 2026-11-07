"use client";

import React, { useMemo } from "react";
import type {
  WorkoutBlockDto,
  WorkoutBlockItemDto,
  WorkoutItemCombinationDto,
} from "@/lib/training-v2/types";
import { ExerciseCard } from "./exercise-card";
import { CombinationCard } from "./combination-card";
import { InsertHereDivider } from "./insert-here-divider";

interface DivisionWorkspaceProps {
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
  onOpenMethodModal: (method: "BI_SET" | "TRI_SET" | "CIRCUIT", insertIndex?: number) => void;
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

export function DivisionWorkspace({
  block,
  onUpdateItemConfig,
  onMoveItemUp,
  onMoveItemDown,
  onDuplicateItem,
  onDeleteItem,
  onOpenAddModal,
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

  if (isEmpty) {
    return (
      <div className="w-full bg-white border border-dashed border-[#D5E2D7] rounded-3xl p-6 sm:p-10 text-center space-y-4 shadow-xs">
        <div className="w-14 h-14 rounded-2xl bg-[#E8F0EA] text-[#176B49] flex items-center justify-center text-2xl mx-auto shadow-2xs">
          🏋️
        </div>

        <div className="max-w-md mx-auto space-y-1">
          <h2 className="text-base sm:text-lg font-bold text-[#102E23]">
            Esta divisão está vazia
          </h2>
          <p className="text-xs sm:text-sm text-[#526058]">
            Adicione exercícios diretamente, utilize um método avançado ou aproveite uma sugestão rápida:
          </p>
        </div>

        {/* Botões Rápidos de Início */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
          <button
            type="button"
            onClick={() => onOpenAddModal(0)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-xs bg-[#176B49] hover:bg-[#102E23] text-white transition-colors shadow-xs cursor-pointer"
          >
            <PlusIcon />
            <span>Adicionar exercício</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenMethodModal("BI_SET", 0)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl font-bold text-xs bg-white hover:bg-[#F5F5F0] border border-[#E5E8E2] text-[#102E23] transition-colors shadow-2xs cursor-pointer"
          >
            <span>⚡ Criar Bi-set</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenModelsDrawer(0)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl font-semibold text-xs bg-white hover:bg-[#F5F5F0] border border-[#E5E8E2] text-[#526058] hover:text-[#102E23] transition-colors shadow-2xs cursor-pointer"
          >
            <span>📚 Usar modelo pronto</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenAiDrawer(0)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl font-semibold text-xs bg-white hover:bg-[#F5F5F0] border border-[#E5E8E2] text-[#526058] hover:text-[#102E23] transition-colors shadow-2xs cursor-pointer"
          >
            <span>✨ Sugestão da IA</span>
          </button>
        </div>
      </div>
    );
  }

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
