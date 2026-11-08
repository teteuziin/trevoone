"use client";

import React from "react";
import type {
  WorkoutBlockItemDto,
  WorkoutItemCombinationDto,
} from "@/lib/training-v2/types";
import { ExerciseCard } from "./exercise-card";

interface CombinationCardProps {
  combination: WorkoutItemCombinationDto;
  items: WorkoutBlockItemDto[];
  index: number;
  totalCombinations: number;
  onUpdateConfig: (itemPublicId: string, updates: {
    setsCount?: number;
    reps?: string;
    loadKg?: number | null;
    restSeconds?: number | null;
    notes?: string;
    tempo?: string;
    rpeTarget?: number | null;
  }) => Promise<void>;
  onSwapOrder: (combinationPublicId: string) => Promise<void>;
  onUngroup: (combinationPublicId: string) => Promise<void>;
  onDuplicate: (combinationPublicId: string) => Promise<void>;
  onDelete: (combinationPublicId: string) => Promise<void>;
  onAddItem: (combinationPublicId: string) => void;
  onRemoveItemFromCombination: (combinationPublicId: string, itemPublicId: string) => Promise<void>;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst?: boolean;
  isLast?: boolean;
}

function ArrowsRightLeftIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
    </svg>
  );
}

function CopyIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </svg>
  );
}

function TrashIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
  );
}

export function CombinationCard({
  combination,
  items,
  onUpdateConfig,
  onSwapOrder,
  onUngroup,
  onDuplicate,
  onDelete,
  onAddItem,
  onRemoveItemFromCombination,
}: CombinationCardProps) {
  const typeLabels: Record<string, string> = {
    BI_SET: "BI-SET",
    TRI_SET: "TRI-SET",
    CIRCUIT: "CIRCUITO",
    SUPERSET: "SUPERSÉRIE",
    SUPER_SET: "SUPERSÉRIE",
    GIANT_SET: "SÉRIE GIGANTE",
  };

  const badgeColors: Record<string, string> = {
    BI_SET: "bg-blue-50 text-blue-700 border-blue-200",
    TRI_SET: "bg-purple-50 text-purple-700 border-purple-200",
    CIRCUIT: "bg-amber-50 text-amber-800 border-amber-200",
    SUPERSET: "bg-emerald-50 text-emerald-800 border-emerald-200",
    SUPER_SET: "bg-emerald-50 text-emerald-800 border-emerald-200",
    GIANT_SET: "bg-orange-50 text-orange-800 border-orange-200",
  };

  const currentType = combination.combinationType || "BI_SET";
  const badgeClass = badgeColors[currentType] || badgeColors.BI_SET;
  const label = typeLabels[currentType] || "MÉTODO AVANÇADO";

  return (
    <div className="w-full bg-[#FAFBF9] border-2 border-[#D5E2D7] rounded-3xl p-4 sm:p-5 shadow-xs space-y-4">
      {/* Top Header do Bloco Avançado */}
      <div className="flex items-center justify-between gap-3 pb-2 border-b border-[#E5E8E2]">
        <div className="flex items-center gap-2.5">
          <span className={`px-2.5 py-1 rounded-xl text-xs font-black uppercase tracking-wider border shadow-2xs ${badgeClass}`}>
            ⚡ {label}
          </span>
          <span className="text-xs font-bold text-[#102E23]">
            {items.length} {items.length === 1 ? "exercício" : "exercícios combinados"}
          </span>
          {combination.restAfterSeconds && (
            <span className="text-[11px] text-[#6B7870] font-medium hidden sm:inline">
              • Descanso após rodada: {combination.restAfterSeconds}s
            </span>
          )}
        </div>

        {/* Ações do Bloco */}
        <div className="flex items-center gap-1.5">
          {/* Inverter A ↔ B */}
          {items.length >= 2 && (
            <button
              type="button"
              onClick={() => onSwapOrder(combination.publicId)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-[#102E23] bg-white hover:bg-[#E8F0EA] border border-[#E5E8E2] transition-colors cursor-pointer"
              title="Inverter ordem dos exercícios (A ↔ B)"
            >
              <ArrowsRightLeftIcon className="w-3.5 h-3.5 text-[#176B49]" />
              <span className="hidden sm:inline">Inverter (A ↔ B)</span>
            </button>
          )}

          {/* Desagrupar */}
          <button
            type="button"
            onClick={() => onUngroup(combination.publicId)}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold text-[#526058] hover:text-[#102E23] hover:bg-white transition-colors cursor-pointer"
            title="Desagrupar exercícios em individuais"
          >
            Desagrupar
          </button>

          {/* Duplicar Bloco */}
          <button
            type="button"
            onClick={() => onDuplicate(combination.publicId)}
            className="p-1.5 rounded-lg text-[#526058] hover:text-[#102E23] hover:bg-white transition-colors cursor-pointer"
            title="Duplicar grupo inteiro"
          >
            <CopyIcon className="w-3.5 h-3.5" />
          </button>

          {/* Excluir Bloco */}
          <button
            type="button"
            onClick={() => {
              if (confirm("Remover este método avançado?")) {
                onDelete(combination.publicId);
              }
            }}
            className="p-1.5 rounded-lg text-[#526058] hover:text-[#DC2626] hover:bg-white transition-colors cursor-pointer"
            title="Remover grupo"
          >
            <TrashIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Lista de Exercícios Internos da Combinação (A, B, C...) */}
      <div className="space-y-3 pl-2 sm:pl-3 border-l-2 border-[#176B49]">
        {items.map((item, itemIdx) => {
          const letter = String.fromCharCode(65 + itemIdx); // A, B, C...

          return (
            <div key={item.publicId} className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-extrabold text-[#176B49]">
                <span className="w-5 h-5 rounded-md bg-[#176B49] text-white flex items-center justify-center text-[10px] font-black">
                  {letter}
                </span>
                <span>Exercício {letter}</span>
              </div>

              <ExerciseCard
                key={item.publicId}
                item={item}
                index={itemIdx}
                totalItems={items.length}
                onUpdateConfig={onUpdateConfig}
                onMoveUp={() => {}}
                onMoveDown={() => {}}
                onDuplicate={() => onDuplicate(combination.publicId)}
                onDelete={() => onRemoveItemFromCombination(combination.publicId, item.publicId)}
              />
            </div>
          );
        })}

        {/* Adicionar exercício ao grupo se compatível */}
        {items.length < (currentType === "BI_SET" ? 2 : currentType === "TRI_SET" ? 3 : 8) && (
          <button
            type="button"
            onClick={() => onAddItem(combination.publicId)}
            className="w-full py-2 px-4 rounded-xl border border-dashed border-[#176B49]/40 hover:border-[#176B49] text-xs font-bold text-[#176B49] hover:bg-[#E8F0EA] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>+ Adicionar exercício ao grupo</span>
          </button>
        )}
      </div>
    </div>
  );
}
