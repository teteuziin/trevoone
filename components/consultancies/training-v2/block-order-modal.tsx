"use client";

import React, { useState } from "react";
import type { WorkoutBlockItemDto, WorkoutItemCombinationDto } from "@/lib/training-v2/types";

export type ReorderEntry =
  | { type: "item"; item: WorkoutBlockItemDto; sortOrder: number }
  | { type: "combination"; combination: WorkoutItemCombinationDto; sortOrder: number };

interface BlockOrderModalProps {
  isOpen: boolean;
  categoryTitle: string;
  entries: ReorderEntry[];
  onClose: () => void;
  onSaveOrder: (orderedItemIds: string[]) => Promise<void>;
}

export function BlockOrderModal({
  isOpen,
  categoryTitle,
  entries,
  onClose,
  onSaveOrder,
}: BlockOrderModalProps) {
  const [list, setList] = useState<ReorderEntry[]>(entries);
  const [prevEntries, setPrevEntries] = useState(entries);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Sync when entries change
  if (entries !== prevEntries) {
    setPrevEntries(entries);
    setList(entries);
  }

  if (!isOpen) return null;

  const moveItem = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= list.length || fromIdx === toIdx) return;
    const next = [...list];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    setList(next);
  };

  const handleDragStart = (idx: number) => {
    setDraggedIdx(idx);
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === idx) return;
    moveItem(draggedIdx, idx);
    setDraggedIdx(idx);
  };

  const handleDragEnd = () => {
    setDraggedIdx(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Flatten into item public IDs
      const itemPublicIds: string[] = [];
      for (const entry of list) {
        if (entry.type === "item") {
          itemPublicIds.push(entry.item.publicId);
        } else {
          const cItems = entry.combination.items || [];
          for (const cit of cItems) {
            itemPublicIds.push(cit.publicId);
          }
        }
      }
      await onSaveOrder(itemPublicIds);
      onClose();
    } catch (err) {
      console.error("[BlockOrderModal] Error saving order:", err);
      alert("Erro ao salvar ordem dos exercícios.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
    >
      <div className="bg-[var(--surface)] border border-[var(--border-subtle)] rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between gap-3 bg-[var(--surface-subtle)]">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-[var(--text-primary)]">
              Organizar Ordem de Execução
            </h3>
            <p className="text-xs text-[var(--text-secondary)] truncate">
              {categoryTitle} • {list.length} {list.length === 1 ? "bloco/exercício" : "blocos/exercícios"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-black/10 text-[var(--text-secondary)] cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Instructions */}
        <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 text-[11px] text-amber-900 dark:text-amber-200">
          💡 Arraste os cards no desktop ou use os botões ▲ / ▼ no celular. A ordem definida aqui é a ordem real executada pelo aluno.
        </div>

        {/* Reorderable List */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2">
          {list.map((entry, idx) => {
            const isFirst = idx === 0;
            const isLast = idx === list.length - 1;
            const isDragging = draggedIdx === idx;

            if (entry.type === "combination") {
              const comb = entry.combination;
              const combItems = comb.items || [];
              const typeLabel = comb.combinationType ? comb.combinationType.replace("_", "-") : "Combinação";

              return (
                <div
                  key={comb.publicId}
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDragEnd={handleDragEnd}
                  className={`p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 transition-all ${
                    isDragging ? "opacity-40 scale-95" : ""
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white font-mono font-bold text-xs flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                            {typeLabel}
                          </span>
                          {comb.title && (
                            <span className="text-xs font-bold text-[var(--text-primary)] truncate">
                              {comb.title}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[var(--text-secondary)] truncate mt-0.5">
                          {combItems.map((ci) => ci.exerciseNameSnapshot).join(" + ")}
                        </p>
                      </div>
                    </div>

                    {/* Stepper & Position Controls */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        disabled={isFirst}
                        onClick={() => moveItem(idx, idx - 1)}
                        title="Subir"
                        className="w-8 h-8 rounded-lg bg-[var(--surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] hover:bg-[var(--surface-active)] disabled:opacity-30 flex items-center justify-center cursor-pointer text-xs"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        disabled={isLast}
                        onClick={() => moveItem(idx, idx + 1)}
                        title="Descer"
                        className="w-8 h-8 rounded-lg bg-[var(--surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] hover:bg-[var(--surface-active)] disabled:opacity-30 flex items-center justify-center cursor-pointer text-xs"
                      >
                        ▼
                      </button>
                      <button
                        type="button"
                        disabled={isFirst}
                        onClick={() => moveItem(idx, 0)}
                        title="Mover para o Início"
                        className="hidden sm:flex px-2 py-1 rounded-lg bg-[var(--surface)] border border-[var(--border-subtle)] text-[10px] font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-30 cursor-pointer"
                      >
                        Topo
                      </button>
                      <button
                        type="button"
                        disabled={isLast}
                        onClick={() => moveItem(idx, list.length - 1)}
                        title="Mover para o Final"
                        className="hidden sm:flex px-2 py-1 rounded-lg bg-[var(--surface)] border border-[var(--border-subtle)] text-[10px] font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-30 cursor-pointer"
                      >
                        Fim
                      </button>
                    </div>
                  </div>
                </div>
              );
            }

            // Standalone item
            const item = entry.item;
            return (
              <div
                key={item.publicId}
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDragEnd={handleDragEnd}
                className={`p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] transition-all ${
                  isDragging ? "opacity-40 scale-95" : ""
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-6 h-6 rounded-lg bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-[var(--text-secondary)] font-mono font-bold text-xs flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[var(--text-primary)] truncate">
                        {item.exerciseNameSnapshot}
                      </p>
                      {item.muscleGroupSnapshot && (
                        <p className="text-[10px] text-[var(--text-tertiary)]">
                          {item.muscleGroupSnapshot}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Stepper & Position Controls */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      disabled={isFirst}
                      onClick={() => moveItem(idx, idx - 1)}
                      title="Subir"
                      className="w-8 h-8 rounded-lg bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-[var(--text-primary)] hover:bg-[var(--surface-active)] disabled:opacity-30 flex items-center justify-center cursor-pointer text-xs"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      disabled={isLast}
                      onClick={() => moveItem(idx, idx + 1)}
                      title="Descer"
                      className="w-8 h-8 rounded-lg bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-[var(--text-primary)] hover:bg-[var(--surface-active)] disabled:opacity-30 flex items-center justify-center cursor-pointer text-xs"
                    >
                      ▼
                    </button>
                    <button
                      type="button"
                      disabled={isFirst}
                      onClick={() => moveItem(idx, 0)}
                      title="Mover para o Início"
                      className="hidden sm:flex px-2 py-1 rounded-lg bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-[10px] font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-30 cursor-pointer"
                    >
                      Topo
                    </button>
                    <button
                      type="button"
                      disabled={isLast}
                      onClick={() => moveItem(idx, list.length - 1)}
                      title="Mover para o Final"
                      className="hidden sm:flex px-2 py-1 rounded-lg bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-[10px] font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-30 cursor-pointer"
                    >
                      Fim
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="p-3 sm:p-4 border-t border-[var(--border-subtle)] bg-[var(--surface-subtle)] flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-[var(--border-subtle)] text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--surface-active)] cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={handleSave}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs cursor-pointer flex items-center gap-2"
          >
            {isSaving ? (
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : null}
            <span>Salvar nova ordem</span>
          </button>
        </div>
      </div>
    </div>
  );
}
