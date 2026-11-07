"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import type { AutoSaveStatus, EditorStudentInfo } from "./types";

interface EditorHeaderProps {
  title: string;
  onUpdateTitle: (newTitle: string) => Promise<void>;
  student: EditorStudentInfo | null;
  onOpenStudentSelector: () => void;
  onRemoveStudent?: () => void;
  saveStatus: AutoSaveStatus;
  backHref: string;
  onOpenPreview: () => void;
  onOpenFinalize: () => void;
  isDraft: boolean;
  versionNumber?: number;
}

function ArrowLeftIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
    </svg>
  );
}

function PencilIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
    </svg>
  );
}

function UserIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  );
}

function EyeIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function CheckIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

function SpinnerIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={`${className} animate-spin`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  );
}

export function EditorHeader({
  title,
  onUpdateTitle,
  student,
  onOpenStudentSelector,
  saveStatus,
  backHref,
  onOpenPreview,
  onOpenFinalize,
  isDraft,
  versionNumber = 1,
}: EditorHeaderProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editableTitle, setEditableTitle] = useState(title);
  const [prevTitle, setPrevTitle] = useState(title);
  if (prevTitle !== title) {
    setPrevTitle(title);
    setEditableTitle(title);
  }
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditingTitle) {
      titleInputRef.current?.focus();
      titleInputRef.current?.select();
    }
  }, [isEditingTitle]);

  const handleSaveTitle = async () => {
    setIsEditingTitle(false);
    const trimmed = editableTitle.trim();
    if (trimmed && trimmed !== title) {
      await onUpdateTitle(trimmed);
    } else {
      setEditableTitle(title);
    }
  };

  return (
    <header className="sticky top-0 z-30 w-full bg-[#F5F5F0]/95 backdrop-blur-md border-b border-[#E5E8E2] pb-3 pt-2">
      <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 flex flex-col gap-2">
        {/* Linha Superior: Voltar + Aluno + Status Salvamento + Ações de Topo */}
        <div className="flex items-center justify-between gap-2">
          {/* Voltar ao Contexto */}
          <div className="flex items-center gap-3">
            <Link
              href={backHref}
              prefetch={false}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white border border-[#E5E8E2] text-xs font-bold text-[#102E23] hover:bg-[#E8F0EA] transition-colors min-h-[36px] shadow-2xs"
            >
              <ArrowLeftIcon className="w-3.5 h-3.5 text-[#526058]" />
              <span className="hidden sm:inline">Voltar</span>
            </Link>

            {/* Status de Salvamento Real */}
            <div className="flex items-center gap-1.5">
              {saveStatus === "saving" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#EBF3ED] text-[#176B49] border border-[#C6E2D1] animate-pulse">
                  <SpinnerIcon />
                  <span>Salvando...</span>
                </span>
              )}
              {saveStatus === "saved" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#EDF5F0] text-[#176B49] border border-[#C6E2D1]">
                  <CheckIcon className="w-3 h-3 text-[#176B49]" />
                  <span>Salvo</span>
                </span>
              )}
              {saveStatus === "error" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#FDF2F2] text-[#DC2626] border border-[#FECACA]">
                  <span>Não foi possível salvar</span>
                </span>
              )}
              {isDraft ? (
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-700 border border-amber-500/20">
                  Rascunho V{versionNumber}
                </span>
              ) : (
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
                  Publicado V{versionNumber}
                </span>
              )}
            </div>
          </div>

          {/* Ações de Topo: Aluno + Prévia + Finalizar */}
          <div className="flex items-center gap-2">
            {/* Aluno Selector Chip */}
            {student ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#D5E2D7] shadow-2xs text-xs">
                <span className="w-5 h-5 rounded-full bg-[#102E23] text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                  {student.name.slice(0, 2).toUpperCase()}
                </span>
                <span className="font-bold text-[#102E23] max-w-[120px] sm:max-w-[180px] truncate">
                  {student.name}
                </span>
                <button
                  type="button"
                  onClick={onOpenStudentSelector}
                  className="text-[11px] text-[#526058] hover:text-[#176B49] font-medium ml-1 cursor-pointer"
                  title="Trocar aluno"
                >
                  Trocar
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onOpenStudentSelector}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-[#E8F0EA] border border-dashed border-[#B8C8BC] text-xs font-bold text-[#102E23] hover:text-[#176B49] transition-colors min-h-[36px] shadow-2xs cursor-pointer"
              >
                <UserIcon className="w-3.5 h-3.5 text-[#176B49]" />
                <span>+ Vincular aluno</span>
              </button>
            )}

            {/* Prévia */}
            <button
              type="button"
              onClick={onOpenPreview}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-[#E8F0EA] border border-[#E5E8E2] text-xs font-bold text-[#102E23] transition-colors min-h-[36px] shadow-2xs cursor-pointer"
            >
              <EyeIcon className="w-3.5 h-3.5 text-[#526058]" />
              <span className="hidden md:inline">Prévia</span>
            </button>

            {/* Finalizar */}
            <button
              type="button"
              onClick={onOpenFinalize}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#176B49] hover:bg-[#102E23] text-white text-xs font-bold transition-all shadow-xs min-h-[36px] cursor-pointer"
            >
              <span>Finalizar</span>
              <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>

        {/* Linha Inferior: Nome da Ficha (Edição Inline) */}
        <div className="flex items-center gap-2 pt-1">
          {isEditingTitle ? (
            <div className="flex items-center gap-2 w-full max-w-xl">
              <input
                ref={titleInputRef}
                type="text"
                value={editableTitle}
                onChange={(e) => setEditableTitle(e.target.value)}
                onBlur={handleSaveTitle}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveTitle();
                  if (e.key === "Escape") {
                    setEditableTitle(title);
                    setIsEditingTitle(false);
                  }
                }}
                className="w-full px-3 py-1.5 text-lg sm:text-2xl font-extrabold text-[#102E23] bg-white border border-[#176B49] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#176B49]/20"
                placeholder="Nome da ficha de treino"
              />
              <button
                type="button"
                onClick={handleSaveTitle}
                className="px-3 py-1.5 text-xs font-bold bg-[#176B49] text-white rounded-xl cursor-pointer"
              >
                Salvar
              </button>
            </div>
          ) : (
            <div
              onClick={() => setIsEditingTitle(true)}
              className="group inline-flex items-center gap-2 cursor-pointer py-0.5 rounded-lg hover:bg-black/5 px-1.5 -ml-1.5 transition-colors"
              title="Clique para renomear a ficha"
            >
              <h1 className="text-lg sm:text-2xl md:text-3xl font-extrabold text-[#102E23] tracking-tight leading-tight font-sans">
                {title || "Sem título"}
              </h1>
              <PencilIcon className="w-3.5 h-3.5 text-[#6B7870] group-hover:text-[#176B49] transition-colors" />
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
