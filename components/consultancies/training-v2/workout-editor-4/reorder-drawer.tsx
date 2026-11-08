"use client";

import React, { useState } from "react";
import type {
  WorkoutBlockDto,
  WorkoutBlockItemDto,
  WorkoutItemCombinationDto,
} from "@/lib/training-v2/types";

interface ReorderDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  block: WorkoutBlockDto;
  blocks?: WorkoutBlockDto[];
  activeBlockPublicId?: string;
  onSelectBlock?: (blockPublicId: string) => void;
  onSaveNewOrder: (itemPublicIds: string[]) => Promise<void>;
}

type ReorderUnit =
  | {
      type: "item";
      id: string;
      item: WorkoutBlockItemDto;
    }
  | {
      type: "combination";
      id: string;
      combination: WorkoutItemCombinationDto;
      items: WorkoutBlockItemDto[];
    };

function XIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
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

function ChevronDoubleUpIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l7.5-7.5 7.5 7.5m-15 6l7.5-7.5 7.5 7.5" />
    </svg>
  );
}

function ChevronDoubleDownIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 5.25l-7.5 7.5-7.5-7.5m15 6l-7.5 7.5-7.5-7.5" />
    </svg>
  );
}

function UndoIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
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

export function ReorderDrawer({
  isOpen,
  onClose,
  block,
  blocks = [],
  activeBlockPublicId,
  onSelectBlock,
  onSaveNewOrder,
}: ReorderDrawerProps) {
  // Build initial units grouping combinations atomically
  const buildUnits = (targetBlock: WorkoutBlockDto): ReorderUnit[] => {
    const combinationMap = new Map<string, WorkoutItemCombinationDto>();
    (targetBlock.combinations || []).forEach((c) => {
      combinationMap.set(c.publicId, c);
    });

    const combItemMap = new Map<string, WorkoutItemCombinationDto>();
    (targetBlock.combinations || []).forEach((c) => {
      (c.items || []).forEach((it) => {
        const id = typeof it === "string" ? it : it.publicId;
        combItemMap.set(id, c);
      });
    });

    const units: ReorderUnit[] = [];
    const processedCombIds = new Set<string>();

    (targetBlock.items || []).forEach((item) => {
      const comb = combItemMap.get(item.publicId);
      if (!comb) {
        units.push({
          type: "item",
          id: item.publicId,
          item,
        });
      } else {
        if (!processedCombIds.has(comb.publicId)) {
          processedCombIds.add(comb.publicId);
          const combItems = (targetBlock.items || []).filter(
            (it) =>
              it.combinationPublicId === comb.publicId ||
              (comb.items || []).some((ci) =>
                typeof ci === "string" ? ci === it.publicId : ci.publicId === it.publicId
              )
          );
          units.push({
            type: "combination",
            id: comb.publicId,
            combination: comb,
            items: combItems,
          });
        }
      }
    });

    return units;
  };

  const [units, setUnits] = useState<ReorderUnit[]>(() => buildUnits(block));
  const [initialUnits, setInitialUnits] = useState<ReorderUnit[]>(() => buildUnits(block));
  const [draggedUnitId, setDraggedUnitId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanged, setHasChanged] = useState(false);

  const [prevBlock, setPrevBlock] = useState(block);
  if (prevBlock !== block) {
    setPrevBlock(block);
    const newUnits = buildUnits(block);
    setUnits(newUnits);
    setInitialUnits(newUnits);
    setHasChanged(false);
  }

  if (!isOpen) return null;

  const handleMove = (index: number, direction: "up" | "down" | "top" | "bottom") => {
    const copy = [...units];
    const unit = copy[index];

    if (direction === "up" && index > 0) {
      copy.splice(index, 1);
      copy.splice(index - 1, 0, unit);
    } else if (direction === "down" && index < copy.length - 1) {
      copy.splice(index, 1);
      copy.splice(index + 1, 0, unit);
    } else if (direction === "top") {
      copy.splice(index, 1);
      copy.unshift(unit);
    } else if (direction === "bottom") {
      copy.splice(index, 1);
      copy.push(unit);
    }

    setUnits(copy);
    setHasChanged(true);
  };

  const handleUndo = () => {
    setUnits([...initialUnits]);
    setHasChanged(false);
  };

  const handleDragStart = (id: string) => {
    setDraggedUnitId(id);
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedUnitId || draggedUnitId === targetId) return;

    const fromIdx = units.findIndex((u) => u.id === draggedUnitId);
    const toIdx = units.findIndex((u) => u.id === targetId);
    if (fromIdx === -1 || toIdx === -1) return;

    const copy = [...units];
    const [moved] = copy.splice(fromIdx, 1);
    copy.splice(toIdx, 0, moved);

    setUnits(copy);
    setHasChanged(true);
  };

  const handleDragEnd = () => {
    setDraggedUnitId(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Flatten all unit item public IDs in exact order
      const orderedIds: string[] = [];
      for (const u of units) {
        if (u.type === "item") {
          orderedIds.push(u.item.publicId);
        } else {
          u.items.forEach((it) => orderedIds.push(it.publicId));
        }
      }

      await onSaveNewOrder(orderedIds);
      setHasChanged(false);
      onClose();
    } catch (err) {
      console.error("Erro ao salvar ordem no modo Organizar:", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Organizar — ${block.title}`}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 font-sans"
    >
      <div className="w-full max-w-xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[90vh] sm:max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#E5E8E2] flex items-center justify-between gap-3 bg-[#FAFBF9]">
          <div className="min-w-0 flex-1">
            <h2 className="text-base sm:text-lg font-black text-[#102E23] truncate">
              Organizar — {block.title}
            </h2>
            <p className="text-xs text-[#526058] mt-0.5">
              Mova exercícios ou grupos inteiros com 1 toque ou arraste.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="w-8 h-8 rounded-full bg-[#F5F5F0] hover:bg-[#EAEFEA] text-[#526058] flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Division Switcher (se houver mais de uma divisão) */}
        {blocks.length > 1 && onSelectBlock && (
          <div className="px-4 py-2 border-b border-[#F0F2ED] bg-[#FAFBF9] flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            <span className="text-[11px] font-bold text-[#6B7870] uppercase shrink-0">
              Divisão:
            </span>
            {blocks.map((b) => {
              const isActive = b.publicId === (activeBlockPublicId || block.publicId);
              return (
                <button
                  key={b.publicId}
                  type="button"
                  onClick={() => onSelectBlock(b.publicId)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    isActive
                      ? "bg-[#102E23] text-white shadow-2xs"
                      : "bg-white text-[#526058] hover:bg-[#EAEFEA] border border-[#E5E8E2]"
                  }`}
                >
                  {b.title}
                </button>
              );
            })}
          </div>
        )}

        {/* Reorderable Items List */}
        <div className="p-3 sm:p-4 overflow-y-auto flex-1 space-y-2">
          {units.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#6B7870]">
              Nenhum exercício nesta divisão ainda.
            </div>
          ) : (
            units.map((unit, idx) => {
              const isFirst = idx === 0;
              const isLast = idx === units.length - 1;
              const isComb = unit.type === "combination";

              return (
                <div
                  key={unit.id}
                  draggable
                  onDragStart={() => handleDragStart(unit.id)}
                  onDragOver={(e) => handleDragOver(e, unit.id)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center justify-between p-3 rounded-2xl border text-xs transition-all ${
                    isComb
                      ? "bg-[#F4F8F5] border-[#D5E2D7] shadow-2xs"
                      : "bg-[#FAFBF9] border-[#E5E8E2] hover:border-[#CCD5CB]"
                  }`}
                >
                  {/* Left: Drag Handle + Order + Title */}
                  <div className="flex items-center gap-2.5 min-w-0 pr-2 flex-1">
                    <span
                      className="text-[#8C9890] hover:text-[#102E23] cursor-grab active:cursor-grabbing p-1 rounded"
                      title="Arraste para mover"
                    >
                      <DragHandleIcon className="w-4 h-4" />
                    </span>

                    <span className="w-6 h-6 rounded-lg bg-[#E8F0EA] text-[#176B49] font-black text-[11px] flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>

                    <div className="min-w-0 flex-1">
                      {isComb ? (
                        <div>
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider bg-[#176B49] text-white">
                              ⚡ {unit.combination.combinationType || "MÉTODO"}
                            </span>
                            <span className="text-[11px] font-bold text-[#176B49]">
                              {unit.items.length} exercícios
                            </span>
                          </div>
                          <p className="font-bold text-[#102E23] truncate">
                            {unit.items.map((i) => i.exerciseNameSnapshot).join(" + ")}
                          </p>
                        </div>
                      ) : (
                        <div>
                          <p className="font-bold text-[#102E23] truncate">
                            {unit.item.exerciseNameSnapshot}
                          </p>
                          {unit.item.muscleGroupSnapshot && (
                            <span className="text-[11px] text-[#6B7870]">
                              {unit.item.muscleGroupSnapshot}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Subir, Descer, Topo, Final Buttons */}
                  <div className="flex items-center gap-1 shrink-0">
                    {/* Ir para início */}
                    <button
                      type="button"
                      disabled={isFirst}
                      onClick={() => handleMove(idx, "top")}
                      className="p-1.5 rounded-lg hover:bg-white text-[#526058] hover:text-[#102E23] disabled:opacity-20 transition-colors cursor-pointer"
                      title="Mover para o topo"
                    >
                      <ChevronDoubleUpIcon className="w-3.5 h-3.5" />
                    </button>

                    {/* Subir */}
                    <button
                      type="button"
                      disabled={isFirst}
                      onClick={() => handleMove(idx, "up")}
                      className="p-1.5 rounded-lg hover:bg-white text-[#526058] hover:text-[#102E23] disabled:opacity-20 transition-colors cursor-pointer"
                      title="Subir uma posição"
                    >
                      <ArrowUpIcon className="w-3.5 h-3.5" />
                    </button>

                    {/* Descer */}
                    <button
                      type="button"
                      disabled={isLast}
                      onClick={() => handleMove(idx, "down")}
                      className="p-1.5 rounded-lg hover:bg-white text-[#526058] hover:text-[#102E23] disabled:opacity-20 transition-colors cursor-pointer"
                      title="Descer uma posição"
                    >
                      <ArrowDownIcon className="w-3.5 h-3.5" />
                    </button>

                    {/* Ir para final */}
                    <button
                      type="button"
                      disabled={isLast}
                      onClick={() => handleMove(idx, "bottom")}
                      className="p-1.5 rounded-lg hover:bg-white text-[#526058] hover:text-[#102E23] disabled:opacity-20 transition-colors cursor-pointer"
                      title="Mover para o fim"
                    >
                      <ChevronDoubleDownIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[#E5E8E2] bg-[#FAFBF9] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!hasChanged}
              onClick={handleUndo}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-[#526058] hover:text-[#102E23] hover:bg-black/5 disabled:opacity-30 transition-colors cursor-pointer"
              title="Desfazer alterações de ordem"
            >
              <UndoIcon className="w-3.5 h-3.5" />
              <span>Desfazer</span>
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-[#526058] hover:text-[#102E23] transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="button"
              disabled={isSaving || !hasChanged}
              onClick={handleSave}
              className="px-5 py-2.5 rounded-xl text-xs font-black bg-[#176B49] text-white hover:bg-[#12583B] transition-all shadow-2xs hover:shadow-xs disabled:opacity-40 flex items-center gap-1.5 cursor-pointer"
            >
              {isSaving ? "Salvando..." : "Salvar organização"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
