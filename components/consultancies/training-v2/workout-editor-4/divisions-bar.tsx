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

function TagIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
    </svg>
  );
}

const WEEKDAYS_SEQUENTIAL = [
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
  "Domingo",
];

const PRESETS_BY_COUNT: Record<number, Array<{ label: string; names: string[] }>> = {
  2: [
    { label: "Superior / Inferior", names: ["Treino Superior", "Treino Inferior"] },
    { label: "Segunda / Quinta", names: ["Segunda-feira", "Quinta-feira"] },
    { label: "Terça / Sexta", names: ["Terça-feira", "Sexta-feira"] },
  ],
  3: [
    { label: "Seg / Qua / Sex", names: ["Segunda-feira", "Quarta-feira", "Sexta-feira"] },
    { label: "Ter / Qui / Sáb", names: ["Terça-feira", "Quinta-feira", "Sábado"] },
    { label: "Push / Pull / Legs", names: ["Push (Empurrar)", "Pull (Puxar)", "Legs (Pernas)"] },
    { label: "Peito / Costas / Pernas", names: ["Peito e Tríceps", "Costas e Bíceps", "Pernas e Ombros"] },
  ],
  4: [
    { label: "Seg / Ter / Qui / Sex", names: ["Segunda-feira", "Terça-feira", "Quinta-feira", "Sexta-feira"] },
    { label: "A / B / C / D clássico", names: ["Peito e Tríceps", "Costas e Bíceps", "Pernas Completo", "Deltoides e Trapézio"] },
  ],
  5: [
    { label: "Segunda a Sexta", names: ["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira"] },
    { label: "ABCDE clássico", names: ["Peitoral", "Dorsais", "Quadríceps", "Deltoides", "Braços e Isquiotibiais"] },
  ],
  6: [
    { label: "Segunda a Sábado", names: ["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"] },
    { label: "PPL 2x", names: ["Push 1", "Pull 1", "Legs 1", "Push 2", "Pull 2", "Legs 2"] },
  ],
};

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
  const [isFormatPickerOpen, setIsFormatPickerOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const formatPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuBlockId(null);
      }
      if (formatPickerRef.current && !formatPickerRef.current.contains(e.target as Node)) {
        setIsFormatPickerOpen(false);
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

  // Format Applicator: preserves all blocks and internal IDs, applying formatted names
  const handleApplyFormat = async (formatType: "letters" | "numbers" | "weekdays" | "custom", customNames?: string[]) => {
    setIsFormatPickerOpen(false);

    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i];
      let newTitle = b.title;

      if (customNames && customNames[i]) {
        newTitle = customNames[i];
      } else if (formatType === "letters") {
        newTitle = `Treino ${String.fromCharCode(65 + i)}`;
      } else if (formatType === "numbers") {
        newTitle = `Treino ${i + 1}`;
      } else if (formatType === "weekdays") {
        newTitle = WEEKDAYS_SEQUENTIAL[i] || `Dia ${i + 1}`;
      }

      if (newTitle && newTitle !== b.title) {
        await onRenameBlock(b.publicId, newTitle);
      }
    }
  };

  const currentPresets = PRESETS_BY_COUNT[blocks.length] || [];

  return (
    <div className="w-full bg-white border border-[#E5E8E2] rounded-2xl p-1.5 shadow-xs font-sans">
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
                    className="w-28 sm:w-36 text-xs font-bold text-[#102E23] bg-transparent focus:outline-none"
                  />
                </div>
              ) : (
                <div
                  className={`group flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? "bg-[#102E23] text-white shadow-xs"
                      : "bg-transparent text-[#526058] hover:text-[#102E23] hover:bg-[#F5F5F0]"
                  }`}
                  onClick={() => onSelectBlock(block.publicId)}
                >
                  <span className="truncate max-w-[130px] sm:max-w-[180px]">
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
                    className="w-full text-left px-3 py-1.5 rounded-lg text-xs font-semibold text-[#102E23] hover:bg-[#F5F5F0] transition-colors cursor-pointer"
                  >
                    Renomear
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOpenMenuBlockId(null);
                      onDuplicateBlock(block.publicId);
                    }}
                    className="w-full text-left px-3 py-1.5 rounded-lg text-xs font-semibold text-[#102E23] hover:bg-[#F5F5F0] transition-colors cursor-pointer"
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
                      className="w-full text-left px-3 py-1.5 rounded-lg text-xs font-semibold text-[#DC2626] hover:bg-[#FDF2F2] transition-colors cursor-pointer"
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

        {/* Botão Formato dos Nomes das Divisões */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setIsFormatPickerOpen(!isFormatPickerOpen)}
            className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl text-xs font-bold text-[#526058] hover:text-[#102E23] hover:bg-[#F5F5F0] border border-[#E5E8E2] transition-colors cursor-pointer"
            title="Escolher formato dos nomes das divisões (Letras, Dias da semana, Números)"
          >
            <TagIcon className="w-3.5 h-3.5 text-[#176B49]" />
            <span className="hidden sm:inline">Formato</span>
          </button>

          {/* Popover Formatos das Divisões */}
          {isFormatPickerOpen && (
            <div
              ref={formatPickerRef}
              className="absolute right-0 sm:left-0 top-full mt-2 z-50 w-72 bg-white border border-[#E5E8E2] rounded-2xl shadow-xl p-3 space-y-2 animate-in fade-in duration-100"
            >
              <div className="border-b border-[#F0F2ED] pb-2">
                <span className="text-[10px] font-black uppercase text-[#176B49] tracking-wider block">
                  FORMATO DAS DIVISÕES
                </span>
                <p className="text-xs text-[#526058]">
                  Padronize os nomes das {blocks.length} divisões em 1 clique:
                </p>
              </div>

              <div className="space-y-1 text-xs">
                {/* 1. Letras */}
                <button
                  type="button"
                  onClick={() => handleApplyFormat("letters")}
                  className="w-full text-left p-2 rounded-xl hover:bg-[#F5F5F0] transition-colors cursor-pointer flex items-center justify-between"
                >
                  <span className="font-bold text-[#102E23]">Letras (A, B, C...)</span>
                  <span className="text-[11px] text-[#6B7870]">Treino A, B...</span>
                </button>

                {/* 2. Números */}
                <button
                  type="button"
                  onClick={() => handleApplyFormat("numbers")}
                  className="w-full text-left p-2 rounded-xl hover:bg-[#F5F5F0] transition-colors cursor-pointer flex items-center justify-between"
                >
                  <span className="font-bold text-[#102E23]">Números (1, 2, 3...)</span>
                  <span className="text-[11px] text-[#6B7870]">Treino 1, 2...</span>
                </button>

                {/* 3. Dias da Semana */}
                <button
                  type="button"
                  onClick={() => handleApplyFormat("weekdays")}
                  className="w-full text-left p-2 rounded-xl hover:bg-[#F5F5F0] transition-colors cursor-pointer flex items-center justify-between"
                >
                  <span className="font-bold text-[#102E23]">Dias da semana</span>
                  <span className="text-[11px] text-[#6B7870]">Segunda, Terça...</span>
                </button>

                {/* Presets específicos por quantidade de blocos */}
                {currentPresets.length > 0 && (
                  <div className="pt-1.5 border-t border-[#F0F2ED] space-y-1">
                    <span className="text-[10px] font-bold text-[#8C9890] uppercase tracking-wider block">
                      Sugestões para {blocks.length} divisões:
                    </span>
                    {currentPresets.map((preset, pIdx) => (
                      <button
                        key={pIdx}
                        type="button"
                        onClick={() => handleApplyFormat("custom", preset.names)}
                        className="w-full text-left p-2 rounded-xl bg-[#FAFBF9] hover:bg-[#E8F0EA] border border-[#E5E8E2] text-xs font-semibold text-[#102E23] transition-colors cursor-pointer flex items-center justify-between"
                      >
                        <span>{preset.label}</span>
                        <span className="text-[#176B49] text-xs">→</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
