"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export function WorkoutMobileScrollActions({
  consultancySlug,
  isTemplatesTab = false,
}: {
  consultancySlug: string;
  isTemplatesTab?: boolean;
}) {
  const [showScrollActions, setShowScrollActions] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Only show when the user has scrolled past the top header/controls (220px)
      if (window.scrollY > 220) {
        setShowScrollActions(true);
      } else {
        setShowScrollActions(false);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (!showScrollActions) return null;

  const scrollToSearch = () => {
    const searchEl = document.getElementById("workout-search-input");
    if (searchEl) {
      searchEl.scrollIntoView({ behavior: "smooth", block: "center" });
      searchEl.focus();
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <aside
      aria-label="Ações rápidas móveis"
      className="fixed bottom-20 right-4 sm:hidden z-30 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200 pointer-events-auto"
    >
      {/* Quick Search Shortcut */}
      <button
        type="button"
        onClick={scrollToSearch}
        aria-label="Ir para a busca de treinos"
        title="Buscar treino"
        className="w-10 h-10 rounded-full bg-white text-[#102E23] border border-[#DEE2DA] shadow-md flex items-center justify-center active:scale-95 transition-all cursor-pointer"
      >
        <svg className="w-4 h-4 text-[#526058]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </button>

      {/* Quick Create Shortcut */}
      <Link
        href={`/consultoria/${consultancySlug}/rotinas/novo${isTemplatesTab ? "?isTemplate=true" : ""}`}
        className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-full bg-[#176B49] text-white font-bold text-xs shadow-md hover:bg-[#12583B] active:scale-95 transition-all min-h-[40px]"
        aria-label={isTemplatesTab ? "Criar novo modelo" : "Criar novo treino"}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        <span>Criar</span>
      </Link>
    </aside>
  );
}
