"use client";

import { useState, useRef, useEffect } from "react";

function MoreVertical({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="1" />
      <circle cx="12" cy="5" r="1" />
      <circle cx="12" cy="19" r="1" />
    </svg>
  );
}

function Copy({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function Bookmark({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function History({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function PlusCircle({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="16" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  );
}

type WorkoutActionsMenuProps = {
  isPublishedOrArchived: boolean;
  onOpenHistory: () => void;
  onDuplicate: () => void;
  onSaveAsTemplate: () => void;
  onCreateNewVersion?: () => void;
};

export function WorkoutActionsMenu({
  isPublishedOrArchived,
  onOpenHistory,
  onDuplicate,
  onSaveAsTemplate,
  onCreateNewVersion,
}: WorkoutActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Ações do treino"
        className="p-2 rounded-xl text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-subtle)] border border-[var(--border-default)] transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xl z-30 py-1.5 animate-in fade-in zoom-in-95 duration-150">
          {/* Create New Version action if currently viewing published/archived */}
          {isPublishedOrArchived && onCreateNewVersion && (
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onCreateNewVersion();
              }}
              className="w-full px-4 py-2.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 flex items-center gap-2.5 transition-colors text-left"
            >
              <PlusCircle className="w-4 h-4 text-emerald-500" />
              Criar Nova Versão (Rascunho)
            </button>
          )}

          {/* History */}
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              onOpenHistory();
            }}
            className="w-full px-4 py-2.5 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--surface-subtle)] flex items-center gap-2.5 transition-colors text-left"
          >
            <History className="w-4 h-4 text-[var(--foreground-muted)]" />
            Histórico de Versões
          </button>

          <div className="my-1 border-t border-[var(--border-subtle)]" />

          {/* Duplicate workout */}
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              onDuplicate();
            }}
            className="w-full px-4 py-2.5 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--surface-subtle)] flex items-center gap-2.5 transition-colors text-left"
          >
            <Copy className="w-4 h-4 text-[var(--foreground-muted)]" />
            Duplicar Treino Completo
          </button>

          {/* Save as Template */}
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              onSaveAsTemplate();
            }}
            className="w-full px-4 py-2.5 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--surface-subtle)] flex items-center gap-2.5 transition-colors text-left"
          >
            <Bookmark className="w-4 h-4 text-[var(--foreground-muted)]" />
            Salvar como Modelo
          </button>
        </div>
      )}
    </div>
  );
}
