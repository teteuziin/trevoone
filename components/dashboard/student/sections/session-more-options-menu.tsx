"use client";

import React, { useState, useRef, useEffect } from "react";

export interface SessionMoreOptionsMenuProps {
  onRestart: () => void;
  label?: string;
  className?: string;
}

export function SessionMoreOptionsMenu({
  onRestart,
  label = "Mais opções",
  className = "",
}: SessionMoreOptionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div className={`relative inline-block w-full sm:w-auto ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label="Mais opções da sessão"
        className="w-full sm:w-auto px-4 py-2.5 min-h-[48px] rounded-xl font-semibold text-sm bg-white dark:bg-[#151619] hover:bg-zinc-100 dark:hover:bg-[#252830] text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer select-none"
      >
        <span>{label}</span>
        <span
          className="text-xs transition-transform duration-150 inline-block text-zinc-400"
          style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}
        >
          ▾
        </span>
      </button>

      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 bottom-full sm:bottom-auto sm:top-full mb-1.5 sm:mb-0 sm:mt-1.5 z-30 w-full sm:w-56 rounded-xl bg-white dark:bg-[#1B1D21] border border-zinc-200 dark:border-[#303238] shadow-xl p-1.5 animate-in fade-in duration-100 text-left"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setIsOpen(false);
              onRestart();
            }}
            className="w-full px-3.5 py-2.5 rounded-lg text-sm font-medium text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-[#252830] hover:text-zinc-900 dark:hover:text-white flex items-center gap-2.5 transition-colors cursor-pointer text-left select-none"
          >
            <span className="text-amber-600 dark:text-amber-400 font-bold">↻</span>
            <span>Começar do início</span>
          </button>
        </div>
      )}
    </div>
  );
}
