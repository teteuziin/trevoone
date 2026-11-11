"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
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

function TrashIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
  );
}

function CopyIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
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

function ChevronLeftIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
    </svg>
  );
}

function ChevronRightIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
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
// MODAL: RENOMEAR DIVISÃO (Clean, Touch & Keyboard Friendly)
// ============================================================================
interface RenameDivisionModalProps {
  isOpen: boolean;
  block: WorkoutBlockDto | null;
  onClose: () => void;
  onSave: (blockPublicId: string, newTitle: string) => Promise<void>;
}

function RenameDivisionModalInner({
  block,
  onClose,
  onSave,
}: {
  block: WorkoutBlockDto;
  onClose: () => void;
  onSave: (blockPublicId: string, newTitle: string) => Promise<void>;
}) {
  const [title, setTitle] = useState(block.title || "");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, []);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      setError("O nome da divisão não pode ficar vazio.");
      inputRef.current?.focus();
      return;
    }
    if (trimmed.length > 100) {
      setError("O nome da divisão pode ter no máximo 100 caracteres.");
      return;
    }

    setIsSaving(true);
    try {
      await onSave(block.publicId, trimmed);
      onClose();
    } catch {
      setError("Erro ao salvar nome da divisão. Tente novamente.");
      setIsSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="rename-modal-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 font-sans"
    >
      <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden border border-[#E5E8E2] flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#E5E8E2] flex items-center justify-between gap-3 bg-[#FAFBF9]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-[#E8F0EA] text-[#176B49] flex items-center justify-center shrink-0">
              <PencilIcon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 id="rename-modal-title" className="text-sm sm:text-base font-black text-[#102E23] truncate">
                Renomear divisão
              </h2>
              <p className="text-[11px] text-[#526058] truncate">
                Altere o nome da divisão de treino
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#F5F5F0] hover:bg-[#EAEFEA] text-[#526058] flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="division-title-input" className="text-xs font-bold text-[#102E23]">
                Nome da divisão
              </label>
              <span className="text-[10px] font-semibold text-[#8C9890]">
                {title.length}/100
              </span>
            </div>
            <input
              id="division-title-input"
              ref={inputRef}
              type="text"
              value={title}
              maxLength={100}
              onChange={(e) => {
                setTitle(e.target.value);
                if (error) setError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") onClose();
              }}
              placeholder="Ex.: Segunda-feira — Peito e Tríceps"
              className={`w-full px-3.5 py-3 rounded-xl border text-sm font-semibold transition-all focus:outline-none ${
                error
                  ? "border-red-500 bg-red-50/30 text-[#102E23] focus:ring-2 focus:ring-red-500/20"
                  : "border-[#CCD5CB] bg-white text-[#102E23] focus:border-[#176B49] focus:ring-2 focus:ring-[#176B49]/15"
              }`}
            />
            {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              disabled={isSaving}
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-[#526058] hover:text-[#102E23] hover:bg-black/5 transition-colors cursor-pointer min-h-[44px]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl text-xs font-black bg-[#176B49] text-white hover:bg-[#12583B] transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 min-h-[44px]"
            >
              {isSaving ? "Salvando..." : "Salvar nome"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RenameDivisionModal({ isOpen, block, onClose, onSave }: RenameDivisionModalProps) {
  if (!isOpen || !block) return null;
  return (
    <RenameDivisionModalInner
      key={block.publicId}
      block={block}
      onClose={onClose}
      onSave={onSave}
    />
  );
}

// ============================================================================
// MODAL: CONFIRMAÇÃO DE EXCLUSÃO DE DIVISÃO
// ============================================================================
interface DeleteDivisionModalProps {
  isOpen: boolean;
  block: WorkoutBlockDto | null;
  onClose: () => void;
  onConfirm: (blockPublicId: string) => Promise<void>;
}

function DeleteDivisionModal({ isOpen, block, onClose, onConfirm }: DeleteDivisionModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen || !block) return null;

  const itemsCount = block.items?.length || 0;
  const isPopulated = itemsCount > 0;

  const handleConfirm = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      await onConfirm(block.publicId);
      onClose();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-division-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 font-sans"
    >
      <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden border border-[#E5E8E2] flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#E5E8E2] flex items-center justify-between gap-3 bg-[#FAFBF9]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
              isPopulated ? "bg-red-50 text-red-600" : "bg-[#F5F5F0] text-[#526058]"
            }`}>
              <TrashIcon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 id="delete-division-title" className="text-sm sm:text-base font-black text-[#102E23] truncate">
                {isPopulated ? "Excluir divisão?" : "Excluir divisão vazia?"}
              </h2>
              <p className="text-[11px] text-[#526058] truncate">
                {block.title || "Divisão"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#F5F5F0] hover:bg-[#EAEFEA] text-[#526058] flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 space-y-3.5 text-xs">
          {isPopulated ? (
            <>
              <p className="text-[#36433C] text-sm leading-relaxed">
                Excluir esta divisão? Os exercícios e configurações desta divisão também serão removidos deste rascunho.
              </p>
              <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs font-semibold flex items-center gap-2">
                <span>⚠️</span>
                <span>{itemsCount} exercício(s) desta divisão serão removidos.</span>
              </div>
            </>
          ) : (
            <p className="text-[#36433C] text-sm leading-relaxed">
              Deseja remover a divisão vazia <strong className="font-bold text-[#102E23]">&quot;{block.title}&quot;</strong> deste rascunho?
            </p>
          )}

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              disabled={isDeleting}
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-[#526058] hover:text-[#102E23] hover:bg-black/5 transition-colors cursor-pointer min-h-[44px]"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={isDeleting}
              onClick={handleConfirm}
              className="px-5 py-2.5 rounded-xl text-xs font-black bg-[#DC2626] text-white hover:bg-red-700 transition-all shadow-xs cursor-pointer flex items-center justify-center min-h-[44px] disabled:opacity-50"
            >
              {isDeleting ? "Excluindo..." : "Excluir divisão"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MENU DE AÇÕES DA DIVISÃO (Fixed Bottom Sheet / Modal sem corte por scroll)
// ============================================================================
interface DivisionActionMenuProps {
  isOpen: boolean;
  block: WorkoutBlockDto | null;
  onClose: () => void;
  onStartRename: () => void;
  onDuplicate: () => void;
  onStartDelete: () => void;
}

function DivisionActionMenu({
  isOpen,
  block,
  onClose,
  onStartRename,
  onDuplicate,
  onStartDelete,
}: DivisionActionMenuProps) {
  if (!isOpen || !block) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-100 font-sans"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden border border-[#E5E8E2] p-4 sm:p-5 space-y-2 animate-in slide-in-from-bottom-4 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-2 border-b border-[#F0F2ED]">
          <div className="min-w-0 pr-2">
            <span className="text-[10px] font-black uppercase text-[#176B49] tracking-wider block">
              OPÇÕES DA DIVISÃO
            </span>
            <h3 className="text-sm font-black text-[#102E23] truncate">
              {block.title || "Divisão"}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-[#F5F5F0] hover:bg-[#EAEFEA] text-[#526058] flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <XIcon className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-1.5 pt-1">
          {/* Renomear */}
          <button
            type="button"
            onClick={() => {
              onClose();
              onStartRename();
            }}
            className="w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl hover:bg-[#F5F5F0] text-left transition-colors cursor-pointer group min-h-[48px]"
          >
            <div className="w-8 h-8 rounded-xl bg-[#E8F0EA] text-[#176B49] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <PencilIcon className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-[#102E23]">Renomear divisão</p>
              <p className="text-[11px] text-[#526058]">Mude o título da divisão de treino</p>
            </div>
          </button>

          {/* Duplicar */}
          <button
            type="button"
            onClick={() => {
              onClose();
              onDuplicate();
            }}
            className="w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl hover:bg-[#F5F5F0] text-left transition-colors cursor-pointer group min-h-[48px]"
          >
            <div className="w-8 h-8 rounded-xl bg-[#F5F5F0] text-[#526058] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <CopyIcon className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-[#102E23]">Duplicar divisão</p>
              <p className="text-[11px] text-[#526058]">Crie uma cópia com os mesmos exercícios</p>
            </div>
          </button>

          {/* Excluir */}
          <button
            type="button"
            onClick={() => {
              onClose();
              onStartDelete();
            }}
            className="w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl hover:bg-red-50 text-left transition-colors cursor-pointer group min-h-[48px]"
          >
            <div className="w-8 h-8 rounded-xl bg-red-100/60 text-red-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <TrashIcon className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-red-600">Excluir divisão</p>
              <p className="text-[11px] text-red-500/80">Remover esta divisão deste treino</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MODAL DE FORMATOS DAS DIVISÕES (Letras, Números, Dias da semana, etc.)
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

  const handleToggleWeekday = (day: string) => {
    setSelectedWeekdays((prev) => {
      if (prev.includes(day)) {
        if (prev.length <= 1) return prev;
        return prev.filter((d) => d !== day);
      } else {
        if (prev.length >= blocks.length) {
          return [...prev.slice(1), day];
        }
        return [...prev, day];
      }
    });
  };

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
                        className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 min-h-[38px] ${
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
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-[#526058] hover:text-[#102E23] hover:bg-black/5 transition-colors cursor-pointer min-h-[44px]"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={isApplying}
            onClick={handleConfirm}
            className="px-5 py-2.5 rounded-xl text-xs font-black bg-[#176B49] text-white hover:bg-[#12583B] transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 min-h-[44px]"
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
  // Modals state
  const [renamingBlock, setRenamingBlock] = useState<WorkoutBlockDto | null>(null);
  const [deletingBlock, setDeletingBlock] = useState<WorkoutBlockDto | null>(null);
  const [actionMenuBlock, setActionMenuBlock] = useState<WorkoutBlockDto | null>(null);
  const [isFormatModalOpen, setIsFormatModalOpen] = useState(false);

  // Horizontal scroll container & edge indicators
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const divisionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScrollEdges = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const hasOverflow = el.scrollWidth > el.clientWidth;
    setCanScrollLeft(hasOverflow && el.scrollLeft > 6);
    setCanScrollRight(hasOverflow && el.scrollLeft < el.scrollWidth - el.clientWidth - 6);
  }, []);

  useEffect(() => {
    checkScrollEdges();
    const el = scrollContainerRef.current;
    if (!el) return;
    el.addEventListener("scroll", checkScrollEdges, { passive: true });
    window.addEventListener("resize", checkScrollEdges);
    return () => {
      el.removeEventListener("scroll", checkScrollEdges);
      window.removeEventListener("resize", checkScrollEdges);
    };
  }, [checkScrollEdges, blocks.length]);

  // Auto-scroll to active division whenever activeBlockPublicId or blocks change
  useEffect(() => {
    if (!activeBlockPublicId) return;
    const targetEl = divisionRefs.current[activeBlockPublicId];
    if (targetEl && scrollContainerRef.current) {
      targetEl.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
      // Recheck scroll edges after smooth scroll animation completes
      setTimeout(checkScrollEdges, 250);
    }
  }, [activeBlockPublicId, blocks.length, checkScrollEdges]);

  const handleScrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -140, behavior: "smooth" });
    }
  };

  const handleScrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 140, behavior: "smooth" });
    }
  };

  const handleAddDivision = async () => {
    const nextLetter = String.fromCharCode(65 + blocks.length);
    const newTitle = `Treino ${nextLetter}`;
    await onAddBlock(newTitle);
  };

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
      <div className="relative w-full bg-white border border-[#E5E8E2] rounded-2xl p-1.5 shadow-xs font-sans">
        {/* Left Scroll Edge Fade & Arrow */}
        {canScrollLeft && (
          <div className="absolute left-1 top-1 bottom-1 z-20 flex items-center">
            <div className="absolute inset-0 bg-gradient-to-r from-white via-white/90 to-transparent w-10 pointer-events-none rounded-l-xl" />
            <button
              type="button"
              onClick={handleScrollLeft}
              aria-label="Rolar divisões para a esquerda"
              className="relative z-21 w-6 h-6 rounded-full bg-white/95 border border-[#D8E4DA] text-[#102E23] hover:bg-[#F5F5F0] shadow-xs flex items-center justify-center transition-all cursor-pointer -ml-0.5"
            >
              <ChevronLeftIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Right Scroll Edge Fade & Arrow */}
        {canScrollRight && (
          <div className="absolute right-1 top-1 bottom-1 z-20 flex items-center justify-end">
            <div className="absolute inset-0 bg-gradient-to-l from-white via-white/90 to-transparent w-10 pointer-events-none rounded-r-xl" />
            <button
              type="button"
              onClick={handleScrollRight}
              aria-label="Rolar divisões para a direita"
              className="relative z-21 w-6 h-6 rounded-full bg-white/95 border border-[#D8E4DA] text-[#102E23] hover:bg-[#F5F5F0] shadow-xs flex items-center justify-center transition-all cursor-pointer -mr-0.5"
            >
              <ChevronRightIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Scrollable Container */}
        <div
          ref={scrollContainerRef}
          className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5 px-0.5 scroll-smooth"
        >
          {blocks.map((block, idx) => {
            const isActive = block.publicId === activeBlockPublicId;
            const itemsCount = block.items?.length || 0;

            return (
              <div
                key={block.publicId}
                ref={(el) => {
                  divisionRefs.current[block.publicId] = el;
                }}
                className="relative flex items-center shrink-0"
              >
                <div
                  className={`group flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-[44px] select-none ${
                    isActive
                      ? "bg-[#102E23] text-white shadow-xs"
                      : "bg-[#FDFDFC] text-[#526058] border border-[#E5E8E2] hover:text-[#102E23] hover:bg-[#F5F5F0]"
                  }`}
                  onClick={() => {
                    if (!isActive) {
                      onSelectBlock(block.publicId);
                    }
                  }}
                >
                  {/* Título com suporte a texto longo e toque para renomear */}
                  <span
                    onClick={(e) => {
                      if (isActive) {
                        e.stopPropagation();
                        setRenamingBlock(block);
                      }
                    }}
                    title={block.title || `Divisão ${idx + 1}`}
                    className="max-w-[170px] sm:max-w-[240px] text-left leading-tight truncate font-bold"
                  >
                    {block.title || `Divisão ${idx + 1}`}
                  </span>

                  {/* Ícone de lápis na divisão ativa para renomear direto */}
                  {isActive && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setRenamingBlock(block);
                      }}
                      aria-label="Renomear divisão"
                      className="p-1 rounded-md text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
                      title="Renomear divisão"
                    >
                      <PencilIcon className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* Contador de Exercícios */}
                  <span
                    className={`text-[11px] font-bold px-1.5 py-0.5 rounded-md shrink-0 ${
                      isActive ? "bg-white/20 text-white" : "bg-black/5 text-[#526058]"
                    }`}
                  >
                    {itemsCount}
                  </span>

                  {/* Menu de 3 pontinhos (Opções da Divisão) */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActionMenuBlock(block);
                    }}
                    aria-label={`Mais opções de ${block.title || "divisão"}`}
                    className={`p-1 rounded-md transition-colors shrink-0 cursor-pointer ${
                      isActive
                        ? "text-white/80 hover:text-white hover:bg-white/10"
                        : "text-[#6B7870] hover:text-[#102E23] hover:bg-black/5"
                    }`}
                    title="Mais opções da divisão"
                  >
                    <MoreVerticalIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}

          {/* Botão + Divisão */}
          <button
            type="button"
            onClick={handleAddDivision}
            className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl text-xs font-bold text-[#176B49] hover:text-[#102E23] hover:bg-[#E8F0EA] border border-dashed border-[#C6E2D1] transition-colors shrink-0 cursor-pointer min-h-[44px]"
            title="Adicionar nova divisão de treino"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            <span>Divisão</span>
          </button>

          {/* Botão Formato dos Nomes das Divisões */}
          {blocks.length > 0 && (
            <button
              type="button"
              onClick={() => setIsFormatModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-[#526058] hover:text-[#102E23] hover:bg-[#F5F5F0] border border-[#E5E8E2] transition-colors shrink-0 cursor-pointer min-h-[44px]"
              title="Formatar nomes das divisões (Letras, Dias da semana, Números)"
            >
              <TagIcon className="w-3.5 h-3.5 text-[#176B49]" />
              <span className="hidden sm:inline">Formato</span>
            </button>
          )}
        </div>
      </div>

      {/* Modal Dedicado de Renomeação */}
      <RenameDivisionModal
        isOpen={Boolean(renamingBlock)}
        block={renamingBlock}
        onClose={() => setRenamingBlock(null)}
        onSave={async (blockPublicId, newTitle) => {
          await onRenameBlock(blockPublicId, newTitle);
        }}
      />

      {/* Modal Dedicado de Confirmação de Exclusão */}
      <DeleteDivisionModal
        isOpen={Boolean(deletingBlock)}
        block={deletingBlock}
        onClose={() => setDeletingBlock(null)}
        onConfirm={async (blockPublicId) => {
          await onDeleteBlock(blockPublicId);
        }}
      />

      {/* Menu de Ações da Divisão (3 pontinhos - Bottom Sheet no Mobile) */}
      <DivisionActionMenu
        isOpen={Boolean(actionMenuBlock)}
        block={actionMenuBlock}
        onClose={() => setActionMenuBlock(null)}
        onStartRename={() => {
          if (actionMenuBlock) {
            setRenamingBlock(actionMenuBlock);
          }
        }}
        onDuplicate={() => {
          if (actionMenuBlock) {
            onDuplicateBlock(actionMenuBlock.publicId);
          }
        }}
        onStartDelete={() => {
          if (actionMenuBlock) {
            setDeletingBlock(actionMenuBlock);
          }
        }}
      />

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
