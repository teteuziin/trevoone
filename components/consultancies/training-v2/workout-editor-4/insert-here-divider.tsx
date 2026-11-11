"use client";

import React, { useState, useRef, useEffect } from "react";

interface InsertHereDividerProps {
  insertIndex: number;
  onInsertExercise: (index: number) => void;
  onInsertMethod: (method: "BI_SET" | "TRI_SET" | "CIRCUIT" | "SUPERSET", index: number) => void;
  onInsertFromModel: (index: number) => void;
  onInsertFromAi: (index: number) => void;
  label?: string;
}

function PlusIcon({ className = "w-3 h-3" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

export function InsertHereDivider({
  insertIndex,
  onInsertExercise,
  onInsertMethod,
  onInsertFromModel,
  onInsertFromAi,
  label = "Inserir aqui",
}: InsertHereDividerProps) {
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
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative py-1.5 group flex items-center justify-center my-0.5">
      {/* Linha discreta que ganha destaque no hover/foco */}
      <div className="absolute inset-x-0 h-[1px] bg-transparent group-hover:bg-[#176B49]/30 transition-colors" />

      {/* Botão Central de Inserção */}
      <div className="relative z-10" ref={menuRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold transition-all shadow-2xs cursor-pointer ${
            isOpen
              ? "bg-[#176B49] text-white ring-2 ring-[#176B49]/30"
              : "bg-white/90 hover:bg-[#176B49] text-[#526058] hover:text-white border border-[#E5E8E2] hover:border-[#176B49]"
          }`}
          title="Inserir exercício ou bloco nesta posição exata"
        >
          <PlusIcon className="w-3 h-3" />
          <span>{label}</span>
        </button>

        {/* Menu Contextual ao Clicar */}
        {isOpen && (
          <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1.5 z-40 min-w-[220px] bg-white border border-[#E5E8E2] rounded-2xl shadow-xl p-2 space-y-1 animate-in fade-in zoom-in-95 duration-100">
            <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[#6B7870] border-b border-[#F0F2ED]">
              Inserir nesta posição
            </div>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onInsertExercise(insertIndex);
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-bold text-[#102E23] hover:bg-[#E8F0EA] hover:text-[#176B49] transition-colors text-left cursor-pointer"
            >
              <span className="w-6 h-6 rounded-lg bg-[#EDF5F0] text-[#176B49] flex items-center justify-center text-xs">
                🏋️
              </span>
              <span>Exercício simples</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onInsertMethod("BI_SET", insertIndex);
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-bold text-[#102E23] hover:bg-[#E8F0EA] hover:text-[#176B49] transition-colors text-left cursor-pointer"
            >
              <span className="w-6 h-6 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center text-xs font-black">
                ⚡
              </span>
              <span>Bi-set (2 exercícios)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onInsertMethod("TRI_SET", insertIndex);
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-bold text-[#102E23] hover:bg-[#E8F0EA] hover:text-[#176B49] transition-colors text-left cursor-pointer"
            >
              <span className="w-6 h-6 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center text-xs font-black">
                ⚡
              </span>
              <span>Tri-set (3 exercícios)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onInsertMethod("SUPERSET", insertIndex);
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-bold text-[#102E23] hover:bg-[#E8F0EA] hover:text-[#176B49] transition-colors text-left cursor-pointer"
            >
              <span className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center text-xs font-black">
                ⚡
              </span>
              <span>Supersérie (antagônicos)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onInsertMethod("CIRCUIT", insertIndex);
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-bold text-[#102E23] hover:bg-[#E8F0EA] hover:text-[#176B49] transition-colors text-left cursor-pointer"
            >
              <span className="w-6 h-6 rounded-lg bg-amber-50 text-amber-800 flex items-center justify-center text-xs font-black">
                🔄
              </span>
              <span>Circuito (estações)</span>
            </button>

            <div className="border-t border-[#F0F2ED] my-1" />

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onInsertFromModel(insertIndex);
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold text-[#526058] hover:bg-[#F5F5F0] hover:text-[#102E23] transition-colors text-left cursor-pointer"
            >
              <span className="w-6 h-6 rounded-lg bg-[#F5F5F0] text-[#526058] flex items-center justify-center text-xs">
                📚
              </span>
              <span>De programa pronto...</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onInsertFromAi(insertIndex);
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold text-[#526058] hover:bg-[#F5F5F0] hover:text-[#102E23] transition-colors text-left cursor-pointer"
            >
              <span className="w-6 h-6 rounded-lg bg-[#F5F5F0] text-[#526058] flex items-center justify-center text-xs">
                ✨
              </span>
              <span>Sugestão da IA...</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
