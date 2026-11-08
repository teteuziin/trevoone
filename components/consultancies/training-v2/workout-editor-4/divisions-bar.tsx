"use client";

import React, { useState, useRef, useEffect } from "react";
import type { WorkoutBlockDto } from "@/lib/training-v2/types";

interface DivisionsBarProps {
  blocks: WorkoutBlockDto[];
  activeBlockPublicId: string;
  onSelectBlock: (blockPublicId: string) => void;
  onAddBlock: (title?: string) => Promise<void>;
  onRenameBlock: (blockPublicId: string, newTitle: string) => Promise<void>;
  onBatchRenameBlocks?: (updates: Array<{ blockPublicId: string; title: string }>) => Promise<void>;
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

function PencilIcon({ className = "w-3 h-3" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
    </svg>
  );
}

function CheckIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

function XIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

const ALL_WEEKDAYS = [
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
    { label: "Superior / Inferior (2x)", names: ["Superior A", "Inferior A", "Superior B", "Inferior B"] },
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

// ============================================================================
// MODAL DE FORMATOS DAS DIVISÕES (Mobile First & Completo)
// ============================================================================
interface FormatModalProps {
  isOpen: boolean;
  onClose: () => void;
  blocks: WorkoutBlockDto[];
  onApply: (updates: Array<{ blockPublicId: string; title: string }>) => Promise<void>;
}

function FormatDivisionsModal({ isOpen, onClose, blocks, onApply }: FormatModalProps) {
  const [formatMode, setFormatMode] = useState<"letters" | "numbers" | "weekdays" | "custom">("letters");
  const [selectedWeekdays, setSelectedWeekdays] = useState<string[]>(() => {
    // Default smart selection according to blocks count
    if (blocks.length === 2) return ["Segunda-feira", "Quinta-feira"];
    if (blocks.length === 3) return ["Segunda-feira", "Quarta-feira", "Sexta-feira"];
    if (blocks.length === 4) return ["Segunda-feira", "Terça-feira", "Quinta-feira", "Sexta-feira"];
    if (blocks.length === 5) return ["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira"];
    if (blocks.length >= 6) return ["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
    return ALL_WEEKDAYS.slice(0, blocks.length);
  });
  const [customTitles, setCustomTitles] = useState<string[]>(() =>
    blocks.map((b, idx) => b.title || `Divisão ${idx + 1}`)
  );
  const [isApplying, setIsApplying] = useState(false);

  if (!isOpen) return null;

  const currentPresets = PRESETS_BY_COUNT[blocks.length] || [];

  // Toggle or add weekday
  const handleToggleWeekday = (day: string) => {
    setSelectedWeekdays((prev) => {
      if (prev.includes(day)) {
        if (prev.length <= 1) return prev; // Keep at least one
        return prev.filter((d) => d !== day);
      } else {
        if (prev.length >= blocks.length) {
          // Replace last one or shift
          return [...prev.slice(1), day];
        }
        return [...prev, day];
      }
    });
  };

  // Quick preset apply
  const handleSelectPreset = (names: string[]) => {
    setCustomTitles((prev) => {
      const next = [...prev];
      names.forEach((name, i) => {
        if (i < next.length) next[i] = name;
      });
      return next;
    });
    setFormatMode("custom");
  };

  const handleConfirm = async () => {
    setIsApplying(true);
    try {
      const updates: Array<{ blockPublicId: string; title: string }> = [];

      for (let i = 0; i < blocks.length; i++) {
        const b = blocks[i];
        let newTitle = b.title || `Divisão ${i + 1}`;

        if (formatMode === "letters") {
          newTitle = `Treino ${String.fromCharCode(65 + i)}`;
        } else if (formatMode === "numbers") {
          newTitle = `Treino ${i + 1}`;
        } else if (formatMode === "weekdays") {
          newTitle = selectedWeekdays[i] || ALL_WEEKDAYS[i % ALL_WEEKDAYS.length];
        } else if (formatMode === "custom") {
          newTitle = customTitles[i]?.trim() || `Divisão ${i + 1}`;
        }

        updates.push({ blockPublicId: b.publicId, title: newTitle });
      }

      await onApply(updates);
      onClose();
    } finally {
      setIsApplying(false);
    }
  };

  // Compute live preview list
  const previewNames: string[] = blocks.map((b, i) => {
    if (formatMode === "letters") return `Treino ${String.fromCharCode(65 + i)}`;
    if (formatMode === "numbers") return `Treino ${i + 1}`;
    if (formatMode === "weekdays") return selectedWeekdays[i] || ALL_WEEKDAYS[i % ALL_WEEKDAYS.length];
    return customTitles[i]?.trim() || `Divisão ${i + 1}`;
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Formato dos Nomes das Divisões"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 font-sans"
    >
      <div className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#E5E8E2] flex items-center justify-between gap-3 bg-[#FAFBF9]">
          <div>
            <span className="text-[10px] font-black uppercase text-[#176B49] tracking-wider block">
              ORGANIZAÇÃO DAS DIVISÕES
            </span>
            <h2 className="text-base sm:text-lg font-black text-[#102E23]">
              Formato dos Nomes ({blocks.length} divisões)
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#F5F5F0] hover:bg-[#EAEFEA] text-[#526058] flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
          {/* Format Mode Tabs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 bg-[#F5F5F0] rounded-2xl">
            <button
              type="button"
              onClick={() => setFormatMode("letters")}
              className={`py-2 px-2 rounded-xl font-bold transition-all text-center cursor-pointer ${
                formatMode === "letters"
                  ? "bg-white text-[#102E23] shadow-xs"
                  : "text-[#526058] hover:text-[#102E23]"
              }`}
            >
              Letras (A, B, C)
            </button>
            <button
              type="button"
              onClick={() => setFormatMode("numbers")}
              className={`py-2 px-2 rounded-xl font-bold transition-all text-center cursor-pointer ${
                formatMode === "numbers"
                  ? "bg-white text-[#102E23] shadow-xs"
                  : "text-[#526058] hover:text-[#102E23]"
              }`}
            >
              Números (1, 2, 3)
            </button>
            <button
              type="button"
              onClick={() => setFormatMode("weekdays")}
              className={`py-2 px-2 rounded-xl font-bold transition-all text-center cursor-pointer ${
                formatMode === "weekdays"
                  ? "bg-white text-[#102E23] shadow-xs"
                  : "text-[#526058] hover:text-[#102E23]"
              }`}
            >
              Dias da Semana
            </button>
            <button
              type="button"
              onClick={() => setFormatMode("custom")}
              className={`py-2 px-2 rounded-xl font-bold transition-all text-center cursor-pointer ${
                formatMode === "custom"
                  ? "bg-white text-[#102E23] shadow-xs"
                  : "text-[#526058] hover:text-[#102E23]"
              }`}
            >
              Personalizado
            </button>
          </div>

          {/* Mode 1 & 2: Letters / Numbers Explanation */}
          {formatMode === "letters" && (
            <div className="p-3.5 rounded-2xl bg-[#F9FCFA] border border-[#D5E4D8] space-y-1">
              <p className="font-bold text-[#102E23]">Padrão tradicional de letras</p>
              <p className="text-[#526058]">
                As divisões serão nomeadas em sequência: Treino A, Treino B, Treino C, etc.
              </p>
            </div>
          )}

          {formatMode === "numbers" && (
            <div className="p-3.5 rounded-2xl bg-[#F9FCFA] border border-[#D5E4D8] space-y-1">
              <p className="font-bold text-[#102E23]">Padrão numérico sequencial</p>
              <p className="text-[#526058]">
                As divisões serão nomeadas em sequência: Treino 1, Treino 2, Treino 3, etc.
              </p>
            </div>
          )}

          {/* Mode 3: Interactive Weekdays */}
          {formatMode === "weekdays" && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-[#F9FCFA] border border-[#D5E4D8] space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-[#102E23]">Selecione os {blocks.length} dias de treino do aluno:</p>
                  <span className="text-[11px] font-extrabold text-[#176B49] bg-white px-2 py-0.5 rounded-md border border-[#D5E4D8]">
                    {selectedWeekdays.length}/{blocks.length} selecionados
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {ALL_WEEKDAYS.map((day) => {
                    const isSelected = selectedWeekdays.includes(day);
                    const orderIndex = selectedWeekdays.indexOf(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => handleToggleWeekday(day)}
                        className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                          isSelected
                            ? "bg-[#176B49] text-white shadow-xs"
                            : "bg-white text-[#526058] border border-[#E5E8E2] hover:bg-[#F5F5F0]"
                        }`}
                      >
                        {isSelected && (
                          <span className="w-4 h-4 rounded-full bg-white/20 text-[10px] flex items-center justify-center font-black">
                            {orderIndex + 1}
                          </span>
                        )}
                        <span>{day}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quick Weekday Presets */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C9890]">
                  Atalhos de dias mais comuns:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSelectedWeekdays(["Segunda-feira", "Quarta-feira", "Sexta-feira"])}
                    className="px-2.5 py-1 rounded-lg bg-[#FAFBF9] border border-[#E5E8E2] hover:border-[#176B49] font-semibold text-[#102E23] cursor-pointer"
                  >
                    Seg / Qua / Sex
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedWeekdays(["Terça-feira", "Quinta-feira", "Sábado"])}
                    className="px-2.5 py-1 rounded-lg bg-[#FAFBF9] border border-[#E5E8E2] hover:border-[#176B49] font-semibold text-[#102E23] cursor-pointer"
                  >
                    Ter / Qui / Sáb
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedWeekdays(["Segunda-feira", "Terça-feira", "Quinta-feira", "Sexta-feira"])}
                    className="px-2.5 py-1 rounded-lg bg-[#FAFBF9] border border-[#E5E8E2] hover:border-[#176B49] font-semibold text-[#102E23] cursor-pointer"
                  >
                    Seg / Ter / Qui / Sex
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedWeekdays(["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira"])}
                    className="px-2.5 py-1 rounded-lg bg-[#FAFBF9] border border-[#E5E8E2] hover:border-[#176B49] font-semibold text-[#102E23] cursor-pointer"
                  >
                    Seg a Sex
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Mode 4: Custom Titles with Inputs & Presets */}
          {formatMode === "custom" && (
            <div className="space-y-3">
              <div className="space-y-2">
                <p className="font-bold text-[#102E23]">Digite o nome de cada divisão:</p>
                <div className="space-y-1.5">
                  {blocks.map((b, i) => (
                    <div key={b.publicId} className="flex items-center gap-2">
                      <span className="w-16 font-bold text-[#6B7870] shrink-0 text-right">
                        Divisão {i + 1}:
                      </span>
                      <input
                        type="text"
                        value={customTitles[i] ?? ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCustomTitles((prev) => {
                            const next = [...prev];
                            next[i] = val;
                            return next;
                          });
                        }}
                        placeholder={`Ex: Peito e Tríceps`}
                        className="flex-1 px-3 py-2 rounded-xl bg-white border border-[#CCD5CB] focus:border-[#176B49] focus:outline-none font-semibold text-[#102E23]"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Presets by blocks count */}
              {currentPresets.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-[#F0F2ED]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C9890]">
                    Sugestões prontas para {blocks.length} divisões:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {currentPresets.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectPreset(preset.names)}
                        className="p-2 rounded-xl bg-[#FAFBF9] hover:bg-[#E8F0EA] border border-[#E5E8E2] text-left font-bold text-[#102E23] transition-colors cursor-pointer flex items-center justify-between"
                      >
                        <span>{preset.label}</span>
                        <span className="text-[#176B49] text-xs">Preencher →</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Live Preview List */}
          <div className="p-3.5 rounded-2xl bg-[#FAFBF9] border border-[#E5E8E2] space-y-1.5">
            <span className="text-[10px] font-black uppercase text-[#176B49] tracking-wider block">
              PRÉVIA DO RESULTADO
            </span>
            <div className="flex flex-wrap gap-1.5">
              {previewNames.map((name, i) => (
                <div
                  key={i}
                  className="px-3 py-1.5 rounded-xl bg-white border border-[#CDEED5] text-[#12583B] font-bold flex items-center gap-1.5 shadow-2xs"
                >
                  <span className="w-4 h-4 rounded-full bg-[#EBF7EE] text-[10px] flex items-center justify-center font-black">
                    {i + 1}
                  </span>
                  <span className="break-words">{name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[#E5E8E2] bg-[#FAFBF9] flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-[#526058] hover:text-[#102E23] hover:bg-black/5 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={isApplying}
            onClick={handleConfirm}
            className="px-5 py-2.5 rounded-xl text-xs font-black bg-[#176B49] text-white hover:bg-[#12583B] transition-all shadow-2xs hover:shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isApplying ? "Salvando..." : "Aplicar formato"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT: DIVISIONS BAR
// ============================================================================
export function DivisionsBar({
  blocks,
  activeBlockPublicId,
  onSelectBlock,
  onAddBlock,
  onRenameBlock,
  onBatchRenameBlocks,
  onDuplicateBlock,
  onDeleteBlock,
}: DivisionsBarProps) {
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [openMenuBlockId, setOpenMenuBlockId] = useState<string | null>(null);
  const [isFormatModalOpen, setIsFormatModalOpen] = useState(false);
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

  // Format applicator using batch update when available
  const handleApplyBatchFormat = async (updates: Array<{ blockPublicId: string; title: string }>) => {
    if (onBatchRenameBlocks) {
      await onBatchRenameBlocks(updates);
    } else {
      for (const u of updates) {
        await onRenameBlock(u.blockPublicId, u.title);
      }
    }
  };

  return (
    <>
      <div className="w-full bg-white border border-[#E5E8E2] rounded-2xl p-1.5 shadow-xs font-sans">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5 px-0.5">
          {blocks.map((block, idx) => {
            const isActive = block.publicId === activeBlockPublicId;
            const itemsCount = block.items?.length || 0;
            const isEditing = editingBlockId === block.publicId;

            return (
              <div key={block.publicId} className="relative flex items-center shrink-0">
                {isEditing ? (
                  <div className="flex items-center gap-1 px-2 py-1 rounded-xl bg-[#E8F0EA] border border-[#176B49] shadow-xs">
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleFinishRename(block.publicId);
                        if (e.key === "Escape") setEditingBlockId(null);
                      }}
                      autoFocus
                      placeholder="Nome da divisão..."
                      className="w-32 sm:w-44 text-xs font-bold text-[#102E23] bg-transparent focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleFinishRename(block.publicId)}
                      aria-label="Confirmar nome"
                      className="p-1 rounded-lg bg-[#176B49] text-white hover:bg-[#12583B] cursor-pointer"
                      title="Salvar nome"
                    >
                      <CheckIcon className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingBlockId(null)}
                      aria-label="Cancelar edição"
                      className="p-1 rounded-lg text-[#526058] hover:bg-black/5 cursor-pointer"
                      title="Cancelar"
                    >
                      <XIcon className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div
                    className={`group flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isActive
                        ? "bg-[#102E23] text-white shadow-xs"
                        : "bg-transparent text-[#526058] hover:text-[#102E23] hover:bg-[#F5F5F0]"
                    }`}
                    onClick={() => {
                      if (!isActive) {
                        onSelectBlock(block.publicId);
                      }
                    }}
                  >
                    {/* Título com suporte a 2 linhas e clique direto para renomear se ativo */}
                    <span
                      onClick={(e) => {
                        if (isActive) {
                          e.stopPropagation();
                          handleStartRename(block);
                        }
                      }}
                      title={isActive ? "Toque para renomear" : block.title || `Divisão ${idx + 1}`}
                      className="line-clamp-2 max-w-[150px] sm:max-w-[220px] text-left leading-tight break-words"
                    >
                      {block.title || `Divisão ${idx + 1}`}
                    </span>

                    {/* Ícone de lápis quando ativo para renomear rápido com 1 toque */}
                    {isActive && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartRename(block);
                        }}
                        aria-label="Renomear divisão"
                        className="p-0.5 rounded text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                        title="Renomear divisão"
                      >
                        <PencilIcon className="w-3 h-3" />
                      </button>
                    )}

                    <span
                      className={`text-[11px] font-semibold px-1.5 py-0.2 rounded-md shrink-0 ${
                        isActive ? "bg-white/20 text-white" : "bg-black/5 text-[#6B7870]"
                      }`}
                    >
                      {itemsCount}
                    </span>

                    {/* Botão de Menu da Divisão (3 pontinhos) */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuBlockId(openMenuBlockId === block.publicId ? null : block.publicId);
                      }}
                      className={`p-1 rounded-md transition-colors shrink-0 ${
                        isActive
                          ? "text-white/80 hover:text-white hover:bg-white/10"
                          : "text-[#6B7870] hover:text-[#102E23] hover:bg-black/5"
                      }`}
                      title="Mais opções da divisão"
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
          <button
            type="button"
            onClick={() => setIsFormatModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-[#526058] hover:text-[#102E23] hover:bg-[#F5F5F0] border border-[#E5E8E2] transition-colors shrink-0 cursor-pointer"
            title="Escolher formato dos nomes das divisões (Letras, Dias da semana, Números)"
          >
            <TagIcon className="w-3.5 h-3.5 text-[#176B49]" />
            <span>Formato</span>
          </button>
        </div>
      </div>

      {/* Modal Completo de Formatos de Divisões */}
      <FormatDivisionsModal
        key={`${isFormatModalOpen}-${blocks.map((b) => b.publicId + (b.title || "")).join("-")}`}
        isOpen={isFormatModalOpen}
        onClose={() => setIsFormatModalOpen(false)}
        blocks={blocks}
        onApply={handleApplyBatchFormat}
      />
    </>
  );
}
