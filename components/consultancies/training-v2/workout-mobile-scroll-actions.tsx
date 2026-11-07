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
    const headerEl = document.getElementById("top-header-actions");

    if (typeof IntersectionObserver !== "undefined" && headerEl) {
      const observer = new IntersectionObserver(
        ([entry]) => {
          // If header is in viewport, do NOT show floating actions
          setShowScrollActions(!entry.isIntersecting);
        },
        { threshold: 0.1 }
      );
      observer.observe(headerEl);
      return () => observer.disconnect();
    }

    // Fallback: scroll threshold
    const handleScroll = () => {
      if (window.scrollY > 280) {
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
      aria-label="Ações rápidas de treino"
      className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] right-3.5 sm:hidden z-30 flex items-center gap-1.5 animate-in fade-in slide-in-from-bottom-2 duration-150 pointer-events-auto"
    >
      {/* Quick Search Shortcut */}
      <button
        type="button"
        onClick={scrollToSearch}
        aria-label="Ir para a busca de treinos"
        title="Buscar treino"
        className="w-9 h-9 rounded-full bg-white text-[#102E23] border border-[#DEE2DA] shadow-md flex items-center justify-center active:scale-95 transition-all cursor-pointer"
      >
        <svg className="w-4 h-4 text-[#526058]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </button>

      {/* Quick Create Shortcut */}
      <Link
        href={`/consultoria/${consultancySlug}/rotinas/novo${isTemplatesTab ? "?isTemplate=true" : ""}`}
        className="flex items-center gap-1 px-3 py-2 rounded-full bg-[#176B49] text-white font-bold text-xs shadow-md hover:bg-[#12583B] active:scale-95 transition-all min-h-[36px]"
        aria-label={isTemplatesTab ? "Criar novo modelo" : "Criar novo treino"}
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        <span>Criar</span>
      </Link>
    </aside>
  );
}
