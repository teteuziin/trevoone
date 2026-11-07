"use client";

import React from "react";

interface ShortcutsDockProps {
  onOpenAdd: () => void;
  onOpenModels: () => void;
  onOpenAi: () => void;
  onOpenReorder: () => void;
  onOpenFinalize: () => void;
}

function PlusIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function BookOpenIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  );
}

function SparklesIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
    </svg>
  );
}

function ArrowsUpDownIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5L7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 0L16.5 21m0 0L12 16.5m4.5 4.5V7.5" />
    </svg>
  );
}

function CheckCircleIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

export function ShortcutsDock({
  onOpenAdd,
  onOpenModels,
  onOpenAi,
  onOpenReorder,
  onOpenFinalize,
}: ShortcutsDockProps) {
  return (
    <aside
      aria-label="Barra de ações do editor"
      className="fixed inset-x-0 bottom-0 z-40 px-2 sm:px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] flex justify-center pointer-events-none"
    >
      <div className="pointer-events-auto bg-[#102E23] text-white rounded-2xl sm:rounded-full p-1 sm:p-1.5 shadow-2xl border border-[#163E27] grid grid-cols-5 sm:flex sm:items-center sm:justify-center gap-1 sm:gap-2 w-full max-w-lg">
        {/* 1. Adicionar */}
        <button
          type="button"
          onClick={onOpenAdd}
          className="min-w-0 flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 py-1.5 sm:py-2 px-1 sm:px-3.5 rounded-xl sm:rounded-full text-white bg-[#176B49] hover:bg-emerald-600 transition-colors min-h-[44px] cursor-pointer shadow-xs"
          title="Adicionar exercício, bi-set, tri-set ou circuito"
        >
          <PlusIcon className="w-4 h-4 shrink-0 text-white" />
          <span className="text-[10px] sm:text-xs font-bold tracking-tight truncate w-full text-center leading-tight">
            Adicionar
          </span>
        </button>

        {/* 2. Modelos */}
        <button
          type="button"
          onClick={onOpenModels}
          className="min-w-0 flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 py-1.5 sm:py-2 px-1 sm:px-3 rounded-xl sm:rounded-full text-white/90 hover:text-white hover:bg-white/10 transition-colors min-h-[44px] cursor-pointer"
          title="Modelos de treino prontos"
        >
          <BookOpenIcon className="w-4 h-4 shrink-0" />
          <span className="text-[10px] sm:text-xs font-semibold tracking-tight truncate w-full text-center leading-tight">
            Modelos
          </span>
        </button>

        {/* 3. Me ajuda (IA) */}
        <button
          type="button"
          onClick={onOpenAi}
          className="min-w-0 flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 py-1.5 sm:py-2 px-1 sm:px-3 rounded-xl sm:rounded-full text-emerald-300 hover:text-emerald-200 hover:bg-white/10 transition-colors min-h-[44px] cursor-pointer"
          title="Me ajuda — IA para sugestões, alternativas e montagem"
        >
          <SparklesIcon className="w-4 h-4 shrink-0 text-emerald-400" />
          <span className="text-[10px] sm:text-xs font-bold tracking-tight truncate w-full text-center leading-tight">
            Me ajuda
          </span>
        </button>

        {/* 4. Organizar */}
        <button
          type="button"
          onClick={onOpenReorder}
          className="min-w-0 flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 py-1.5 sm:py-2 px-1 sm:px-3 rounded-xl sm:rounded-full text-white/90 hover:text-white hover:bg-white/10 transition-colors min-h-[44px] cursor-pointer"
          title="Reorganizar ordem dos exercícios"
        >
          <ArrowsUpDownIcon className="w-4 h-4 shrink-0" />
          <span className="text-[10px] sm:text-xs font-semibold tracking-tight truncate w-full text-center leading-tight">
            Organizar
          </span>
        </button>

        {/* 5. Finalizar */}
        <button
          type="button"
          onClick={onOpenFinalize}
          className="min-w-0 flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 py-1.5 sm:py-2 px-1 sm:px-3.5 rounded-xl sm:rounded-full bg-white text-[#102E23] hover:bg-[#EBF3ED] transition-colors min-h-[44px] cursor-pointer shadow-xs"
          title="Conferir e publicar ficha"
        >
          <CheckCircleIcon className="w-4 h-4 shrink-0 text-[#176B49]" />
          <span className="text-[10px] sm:text-xs font-bold tracking-tight truncate w-full text-center leading-tight">
            Finalizar
          </span>
        </button>
      </div>
    </aside>
  );
}
