"use client";

import React, { useState } from "react";
import type { WorkoutBlockDto, WorkoutBlockItemDto } from "@/lib/training-v2/types";

interface ReorderDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  block: WorkoutBlockDto;
  onSaveNewOrder: (itemPublicIds: string[]) => Promise<void>;
}

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

export function ReorderDrawer({
  isOpen,
  onClose,
  block,
  onSaveNewOrder,
}: ReorderDrawerProps) {
  const [items, setItems] = useState<WorkoutBlockItemDto[]>(block.items || []);
  const [prevBlockItems, setPrevBlockItems] = useState(block.items);
  if (prevBlockItems !== block.items) {
    setPrevBlockItems(block.items);
    setItems(block.items || []);
  }
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleMove = (index: number, direction: "up" | "down" | "top" | "bottom") => {
    const copy = [...items];
    const item = copy[index];

    if (direction === "up" && index > 0) {
      copy.splice(index, 1);
      copy.splice(index - 1, 0, item);
    } else if (direction === "down" && index < copy.length - 1) {
      copy.splice(index, 1);
      copy.splice(index + 1, 0, item);
    } else if (direction === "top") {
      copy.splice(index, 1);
      copy.unshift(item);
    } else if (direction === "bottom") {
      copy.splice(index, 1);
      copy.push(item);
    }

    setItems(copy);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const ids = items.map((i) => i.publicId);
      await onSaveNewOrder(ids);
      onClose();
    } catch (err) {
      console.error("Erro ao salvar nova ordem:", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#E5E8E2] flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-extrabold text-[#102E23]">
              Organizar — {block.title}
            </h2>
            <p className="text-xs text-[#526058]">
              Reordene rapidamente a sequência dos exercícios nesta divisão.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#F5F5F0] hover:bg-[#EAEFEA] text-[#526058] flex items-center justify-center transition-colors cursor-pointer"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Compact List */}
        <div className="p-3 sm:p-4 overflow-y-auto flex-1 space-y-1.5">
          {items.map((item, idx) => (
            <div
              key={item.publicId}
              className="flex items-center justify-between p-2.5 rounded-xl bg-[#FAFBF9] border border-[#E5E8E2] text-xs font-semibold"
            >
              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                <span className="w-6 h-6 rounded-lg bg-[#E8F0EA] text-[#176B49] font-black text-[11px] flex items-center justify-center shrink-0">
                  {idx + 1}
                </span>
                <span className="font-bold text-[#102E23] truncate">
                  {item.exerciseNameSnapshot}
                </span>
              </div>

              {/* Move Buttons */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  disabled={idx === 0}
                  onClick={() => handleMove(idx, "up")}
                  className="p-1 rounded-lg hover:bg-white text-[#526058] hover:text-[#102E23] disabled:opacity-20 cursor-pointer"
                  title="Subir"
                >
                  <ArrowUpIcon />
                </button>
                <button
                  type="button"
                  disabled={idx === items.length - 1}
                  onClick={() => handleMove(idx, "down")}
                  className="p-1 rounded-lg hover:bg-white text-[#526058] hover:text-[#102E23] disabled:opacity-20 cursor-pointer"
                  title="Descer"
                >
                  <ArrowDownIcon />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
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
            disabled={isSaving}
            onClick={handleSave}
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#176B49] text-white hover:bg-[#102E23] transition-colors shadow-xs cursor-pointer"
          >
            {isSaving ? "Salvando ordem..." : "Confirmar nova ordem"}
          </button>
        </div>
      </div>
    </div>
  );
}
