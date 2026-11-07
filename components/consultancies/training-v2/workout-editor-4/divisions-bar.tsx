"use client";

import React, { useState, useRef, useEffect } from "react";
import type { WorkoutBlockDto } from "@/lib/training-v2/types";

interface DivisionsBarProps {
  blocks: WorkoutBlockDto[];
  activeBlockPublicId: string;
  onSelectBlock: (blockPublicId: string) => void;
  onAddBlock: (title?: string) => Promise<void>;
  onRenameBlock: (blockPublicId: string, newTitle: string) => Promise<void>;
  onDuplicateBlock: (blockPublicId: string) => Promise<void>;
  onDeleteBlock: (blockPublicId: string) => Promise<void>;
}

function PlusIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function MoreVerticalIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="5" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="12" cy="19" r="1.5" />
    </svg>
  );
}

export function DivisionsBar({
  blocks,
  activeBlockPublicId,
  onSelectBlock,
  onAddBlock,
  onRenameBlock,
  onDuplicateBlock,
  onDeleteBlock,
}: DivisionsBarProps) {
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [openMenuBlockId, setOpenMenuBlockId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuBlockId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleStartRename = (block: WorkoutBlockDto) => {
    setEditingBlockId(block.publicId);
    setEditTitle(block.title || "");
    setOpenMenuBlockId(null);
  };

  const handleFinishRename = async (blockPublicId: string) => {
    const trimmed = editTitle.trim();
    if (trimmed) {
      await onRenameBlock(blockPublicId, trimmed);
    }
    setEditingBlockId(null);
  };

  const handleAddDivision = async () => {
    const nextLetter = String.fromCharCode(65 + blocks.length);
    const newTitle = `Treino ${nextLetter}`;
    await onAddBlock(newTitle);
  };

  return (
    <div className="w-full bg-white border border-[#E5E8E2] rounded-2xl p-1.5 shadow-xs">
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5 px-0.5">
        {blocks.map((block, idx) => {
          const isActive = block.publicId === activeBlockPublicId;
          const itemsCount = block.items?.length || 0;
          const isEditing = editingBlockId === block.publicId;

          return (
            <div key={block.publicId} className="relative flex items-center shrink-0">
              {isEditing ? (
                <div className="flex items-center gap-1 px-2 py-1 rounded-xl bg-[#E8F0EA] border border-[#176B49]">
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onBlur={() => handleFinishRename(block.publicId)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleFinishRename(block.publicId);
                      if (e.key === "Escape") setEditingBlockId(null);
                    }}
                    autoFocus
                    className="w-24 sm:w-32 text-xs font-bold text-[#102E23] bg-transparent focus:outline-none"
                  />
                </div>
              ) : (
                <div
                  className={`group flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? "bg-[#102E23] text-white shadow-xs"
                      : "bg-transparent text-[#526058] hover:text-[#102E23] hover:bg-[#F5F5F0]"
                  }`}
                  onClick={() => onSelectBlock(block.publicId)}
                >
                  <span className="truncate max-w-[140px] sm:max-w-[200px]">
                    {block.title || `Divisão ${idx + 1}`}
                  </span>
                  <span
                    className={`text-[11px] font-semibold px-1.5 py-0.2 rounded-md ${
                      isActive ? "bg-white/20 text-white" : "bg-black/5 text-[#6B7870]"
                    }`}
                  >
                    {itemsCount}
                  </span>

                  {/* Botão de Menu da Divisão */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenMenuBlockId(openMenuBlockId === block.publicId ? null : block.publicId);
                    }}
                    className={`p-1 rounded-md transition-colors ${
                      isActive
                        ? "text-white/80 hover:text-white hover:bg-white/10"
                        : "text-[#6B7870] hover:text-[#102E23] hover:bg-black/5"
                    }`}
                    title="Opções da divisão"
                  >
                    <MoreVerticalIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Menu Dropdown de Opções da Divisão */}
              {openMenuBlockId === block.publicId && (
                <div
                  ref={menuRef}
                  className="absolute left-0 top-full mt-1.5 z-40 min-w-[160px] bg-white border border-[#E5E8E2] rounded-xl shadow-lg p-1.5 space-y-1 animate-in fade-in duration-100"
                >
                  <button
                    type="button"
                    onClick={() => handleStartRename(block)}
                    className="w-full text-left px-3 py-1.5 rounded-lg text-xs font-semibold text-[#102E23] hover:bg-[#F5F5F0] transition-colors"
                  >
                    Renomear
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOpenMenuBlockId(null);
                      onDuplicateBlock(block.publicId);
                    }}
                    className="w-full text-left px-3 py-1.5 rounded-lg text-xs font-semibold text-[#102E23] hover:bg-[#F5F5F0] transition-colors"
                  >
                    Duplicar divisão
                  </button>
                  {blocks.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        setOpenMenuBlockId(null);
                        if (confirm(`Deseja excluir a divisão "${block.title}"?`)) {
                          onDeleteBlock(block.publicId);
                        }
                      }}
                      className="w-full text-left px-3 py-1.5 rounded-lg text-xs font-semibold text-[#DC2626] hover:bg-[#FDF2F2] transition-colors"
                    >
                      Excluir divisão
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Botão + Divisão */}
        <button
          type="button"
          onClick={handleAddDivision}
          className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold text-[#176B49] hover:text-[#102E23] hover:bg-[#E8F0EA] border border-dashed border-[#C6E2D1] transition-colors shrink-0 cursor-pointer"
          title="Adicionar nova divisão (Treino B, Treino C...)"
        >
          <PlusIcon className="w-3.5 h-3.5" />
          <span>Divisão</span>
        </button>
      </div>
    </div>
  );
}
