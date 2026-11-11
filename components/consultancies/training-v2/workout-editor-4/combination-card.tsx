"use client";

import React, { useRef, useState } from "react";
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
  onPreviewVideo?: (item: WorkoutBlockItemDto) => void;
  onReplaceExerciseInCombination?: (combinationPublicId: string, itemPublicId: string) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst?: boolean;
  isLast?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  onLongPressReorder?: () => void;
  isDragging?: boolean;
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

function ArrowUpIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
    </svg>
  );
}

function ArrowDownIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" />
    </svg>
  );
}

function DragHandleIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <circle cx="9" cy="6" r="1.5" />
      <circle cx="15" cy="6" r="1.5" />
      <circle cx="9" cy="12" r="1.5" />
      <circle cx="15" cy="12" r="1.5" />
      <circle cx="9" cy="18" r="1.5" />
      <circle cx="15" cy="18" r="1.5" />
    </svg>
  );
}

function PlusIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
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
  onPreviewVideo,
  onReplaceExerciseInCombination,
  onMoveUp,
  onMoveDown,
  isFirst = false,
  isLast = false,
  onDragStart,
  onDragOver,
  onDrop,
  onLongPressReorder,
  isDragging = false,
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

  // Target positions count
  const requiredSlots =
    currentType === "BI_SET" || currentType === "SUPERSET"
      ? 2
      : currentType === "TRI_SET"
      ? 3
      : Math.max(3, items.length + 1);

  // Position naming generator
  const getSlotLabel = (idx: number) => {
    if (currentType === "CIRCUIT") {
      return `${idx + 1}ª estação`;
    }
    return `${idx + 1}º exercício`;
  };

  // Mobile Long-Press Detection for the entire combination unit
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const [isLongPressing, setIsLongPressing] = useState(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("input, button, textarea, a, select")) return;

    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };

    longPressTimer.current = setTimeout(() => {
      setIsLongPressing(true);
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        try {
          navigator.vibrate(50);
        } catch {
          // ignore
        }
      }
      if (onLongPressReorder) {
        onLongPressReorder();
      }
    }, 380);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartPos.current || !longPressTimer.current) return;
    const touch = e.touches[0];
    const diffX = Math.abs(touch.clientX - touchStartPos.current.x);
    const diffY = Math.abs(touch.clientY - touchStartPos.current.y);

    if (diffX > 10 || diffY > 10) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
      setIsLongPressing(false);
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    setIsLongPressing(false);
    touchStartPos.current = null;
  };

  return (
    <div
      data-testid="combination-card"
      data-combination-id={combination.publicId}
      draggable={Boolean(onDragStart)}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      className={`w-full bg-[#FAFBF9] rounded-3xl p-4 sm:p-5 shadow-xs space-y-4 font-sans select-none transition-all border-2 ${
        isDragging || isLongPressing
          ? "border-[#176B49] ring-2 ring-[#176B49]/30 shadow-md scale-[1.01]"
          : "border-[#D5E2D7] hover:border-[#B8D4BE]"
      }`}
    >
      {/* Top Header do Bloco Avançado */}
      <div className="flex items-center justify-between gap-3 pb-2 border-b border-[#E5E8E2]">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <span
            className="text-[#8C9890] hover:text-[#102E23] cursor-grab active:cursor-grabbing p-0.5 rounded touch-none"
            title="Arraste para mover o método inteiro"
          >
            <DragHandleIcon className="w-4 h-4" />
          </span>

          <span
            className={`px-2.5 py-1 rounded-xl text-xs font-black uppercase tracking-wider border shadow-2xs shrink-0 ${badgeClass}`}
          >
            ⚡ {label}
          </span>

          <span className="text-xs font-bold text-[#102E23] truncate">
            {items.length} {items.length === 1 ? "exercício definido" : "exercícios combinados"}
          </span>

          {combination.restAfterSeconds && (
            <span className="text-[11px] text-[#6B7870] font-medium hidden sm:inline shrink-0">
              • Pausa: {combination.restAfterSeconds}s
            </span>
          )}
        </div>

        {/* Ações do Bloco */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Inverter 1º ↔ 2º */}
          {items.length >= 2 && (
            <button
              type="button"
              onClick={() => onSwapOrder(combination.publicId)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-[#102E23] bg-white hover:bg-[#E8F0EA] border border-[#E5E8E2] transition-colors cursor-pointer shadow-2xs"
              title="Inverter 1º com 2º exercício"
            >
              <ArrowsRightLeftIcon className="w-3.5 h-3.5 text-[#176B49]" />
              <span className="hidden sm:inline">Inverter 1º ↔ 2º</span>
            </button>
          )}

          {/* Subir Bloco */}
          <button
            type="button"
            disabled={isFirst}
            onClick={onMoveUp}
            aria-label="Mover método para cima"
            className="p-1.5 rounded-lg text-[#526058] hover:text-[#102E23] hover:bg-white disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
          >
            <ArrowUpIcon className="w-3.5 h-3.5" />
          </button>

          {/* Descer Bloco */}
          <button
            type="button"
            disabled={isLast}
            onClick={onMoveDown}
            aria-label="Mover método para baixo"
            className="p-1.5 rounded-lg text-[#526058] hover:text-[#102E23] hover:bg-white disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
          >
            <ArrowDownIcon className="w-3.5 h-3.5" />
          </button>

          {/* Desagrupar */}
          <button
            type="button"
            onClick={() => onUngroup(combination.publicId)}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold text-[#526058] hover:text-[#102E23] hover:bg-white transition-colors cursor-pointer hidden sm:inline"
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

      {/* Lista de Exercícios Internos da Combinação Numerados com Posições Claras */}
      <div className="space-y-3 pl-2 sm:pl-3 border-l-2 border-[#176B49]">
        {items.map((item, itemIdx) => {
          const positionLabel = getSlotLabel(itemIdx);

          return (
            <div key={item.publicId} className="space-y-1">
              <ExerciseCard
                key={item.publicId}
                item={item}
                index={itemIdx}
                totalItems={items.length}
                slotLabel={positionLabel}
                onUpdateConfig={onUpdateConfig}
                onMoveUp={() => {}}
                onMoveDown={() => {}}
                onDuplicate={() => onDuplicate(combination.publicId)}
                onDelete={() => onRemoveItemFromCombination(combination.publicId, item.publicId)}
                onPreviewVideo={onPreviewVideo ? () => onPreviewVideo(item) : undefined}
                onSwapSlot={
                  items.length >= 2 ? () => onSwapOrder(combination.publicId) : undefined
                }
                onReplaceExercise={
                  onReplaceExerciseInCombination
                    ? () => onReplaceExerciseInCombination(combination.publicId, item.publicId)
                    : undefined
                }
              />
            </div>
          );
        })}

        {/* Posições Pendentes com Ação Direta "Escolher exercício" */}
        {items.length < requiredSlots && (
          <div className="p-3.5 rounded-2xl border-2 border-dashed border-[#176B49]/40 bg-white/70 hover:bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors">
            <div className="space-y-0.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#176B49]">
                {getSlotLabel(items.length)}
              </span>
              <p className="text-xs text-[#526058] font-semibold">
                Nenhum exercício selecionado para esta posição ainda.
              </p>
            </div>

            <button
              type="button"
              onClick={() => onAddItem(combination.publicId)}
              className="px-4 py-2 rounded-xl text-xs font-black bg-[#176B49] text-white hover:bg-[#12583B] transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
            >
              <PlusIcon className="w-3.5 h-3.5" />
              <span>Escolher {getSlotLabel(items.length)}</span>
            </button>
          </div>
        )}

        {/* Se o método já tem os slots mínimos preenchidos e permite adicionar mais estações (ex: Circuito) */}
        {items.length >= requiredSlots && currentType === "CIRCUIT" && items.length < 8 && (
          <button
            type="button"
            onClick={() => onAddItem(combination.publicId)}
            className="w-full py-2.5 px-4 rounded-xl border border-dashed border-[#176B49]/40 hover:border-[#176B49] text-xs font-bold text-[#176B49] hover:bg-[#E8F0EA] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            <span>+ Adicionar próxima estação ao circuito</span>
          </button>
        )}
      </div>
    </div>
  );
}
