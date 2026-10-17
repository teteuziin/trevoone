"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import type { PersonalWorkoutRow } from "./personal-workouts-table";

export interface PersonalWorkoutSliderProps {
  consultancySlug: string;
  workouts: PersonalWorkoutRow[];
}

function DumbbellIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 5v14M18 5v14M3 9v6M21 9v6M6 12h12" />
    </svg>
  );
}

function ChevronLeftIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function ChevronRightIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

export function PersonalWorkoutSlider({
  consultancySlug,
  workouts = [],
}: PersonalWorkoutSliderProps) {
  const sliderRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [isPaused, setIsPaused] = useState(false);

  const checkScrollBounds = useCallback(() => {
    const el = sliderRef.current;
    if (!el) return;
    const atStart = el.scrollLeft <= 5;
    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 5;
    setCanScrollLeft(!atStart);
    setCanScrollRight(!atEnd);
  }, []);

  useEffect(() => {
    checkScrollBounds();
    const el = sliderRef.current;
    if (!el) return;
    el.addEventListener("scroll", checkScrollBounds, { passive: true });
    window.addEventListener("resize", checkScrollBounds);
    return () => {
      el.removeEventListener("scroll", checkScrollBounds);
      window.removeEventListener("resize", checkScrollBounds);
    };
  }, [workouts, checkScrollBounds]);

  // Rolamento Automático Suave (avança automaticamente a cada 3.8s, pausando ao passar o mouse ou tocar)
  useEffect(() => {
    if (isPaused || workouts.length <= 1) return;
    const timer = setInterval(() => {
      const el = sliderRef.current;
      if (!el) return;
      const maxScroll = el.scrollWidth - el.clientWidth;
      if (el.scrollLeft >= maxScroll - 15) {
        el.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        el.scrollBy({ left: 320, behavior: "smooth" });
      }
    }, 3800);

    return () => clearInterval(timer);
  }, [isPaused, workouts.length]);

  const handleManualScroll = (direction: "left" | "right") => {
    const el = sliderRef.current;
    if (!el) return;
    const offset = 320;
    el.scrollBy({
      left: direction === "left" ? -offset : offset,
      behavior: "smooth",
    });
  };

  if (!workouts || workouts.length === 0) return null;

  return (
    <section
      aria-label="Acesso rápido aos treinos"
      className="w-full space-y-3"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
    >
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
          <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white tracking-tight font-sans">
            Acesso rápido
          </h2>
          <span className="text-xs text-[#6B7280] dark:text-[#C2C8CF] hidden sm:inline">
            (rolamento contínuo)
          </span>
        </div>

        {/* Controles de Navegação do Slider */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={!canScrollLeft}
            onClick={() => handleManualScroll("left")}
            aria-label="Ficha anterior"
            className={`w-8 h-8 rounded-xl border flex items-center justify-center transition-all ${
              !canScrollLeft
                ? "bg-[#151619] border-[#303238] text-zinc-600 opacity-40 cursor-not-allowed"
                : "bg-[#151619] hover:bg-[#1B1D21] border-[#303238] hover:border-[#10B981]/50 text-[#C2C8CF] hover:text-white cursor-pointer active:scale-95"
            }`}
          >
            <ChevronLeftIcon className="w-4 h-4" />
          </button>

          <button
            type="button"
            disabled={!canScrollRight}
            onClick={() => handleManualScroll("right")}
            aria-label="Próxima ficha"
            className={`w-8 h-8 rounded-xl border flex items-center justify-center transition-all ${
              !canScrollRight
                ? "bg-[#151619] border-[#303238] text-zinc-600 opacity-40 cursor-not-allowed"
                : "bg-[#151619] hover:bg-[#1B1D21] border-[#303238] hover:border-[#10B981]/50 text-[#C2C8CF] hover:text-white cursor-pointer active:scale-95"
            }`}
          >
            <ChevronRightIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Trilho de Cards Estilo Slider Automático */}
      <div
        ref={sliderRef}
        className="flex items-stretch gap-3.5 overflow-x-auto scrollbar-none pb-2 pt-1 -mx-1 px-1 snap-x snap-mandatory scroll-smooth"
      >
        {workouts.map((workout) => {
          const isDraft =
            workout.status === "DRAFT" ||
            workout.currentVersionStatus === "DRAFT" ||
            workout.hasActiveDraft;
          const isArchived =
            workout.status === "ARCHIVED" ||
            workout.currentVersionStatus === "ARCHIVED";
          const blocks = workout.blocksCount || 1;

          return (
            <Link
              key={`slider-${workout.publicId}`}
              href={`/consultoria/${consultancySlug}/rotinas/${workout.publicId}`}
              prefetch={false}
              className="min-w-[280px] sm:min-w-[320px] max-w-[340px] p-4.5 rounded-2xl bg-[#151619] hover:bg-[#1B1D21] border border-[#303238] hover:border-[#10B981]/50 transition-all duration-200 group snap-start flex flex-col justify-between min-h-[155px] shadow-sm text-white cursor-pointer active:scale-[0.99]"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-1.5">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-[#1B1D21] text-[#C2C8CF] border border-[#303238]">
                    <DumbbellIcon className="w-3.5 h-3.5 text-[#10B981]" />
                    <span>
                      {blocks} {blocks === 1 ? "bloco" : "blocos"}
                    </span>
                  </span>

                  {/* Badges com Cores de Hierarquia Fortes */}
                  {isDraft && (
                    <span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Rascunho
                    </span>
                  )}
                  {isArchived && (
                    <span className="text-[10px] px-2 py-0.5 rounded-md font-medium bg-[#1B1D21] text-[#C2C8CF] border border-[#303238]">
                      Arquivada
                    </span>
                  )}
                  {!isDraft && !isArchived && (
                    <span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Publicada
                    </span>
                  )}
                </div>

                <h3 className="text-sm sm:text-base font-bold text-white group-hover:text-[#10B981] transition-colors line-clamp-2 mt-1">
                  {workout.title}
                </h3>

                {workout.assignedStudentName ? (
                  <p className="text-xs text-[#C2C8CF] truncate flex items-center gap-1">
                    <span className="text-zinc-500">Aluno:</span>
                    <span className="font-semibold text-white">
                      {workout.assignedStudentName}
                    </span>
                  </p>
                ) : workout.subtitle ? (
                  <p className="text-xs text-[#C2C8CF] truncate">
                    {workout.subtitle}
                  </p>
                ) : (
                  <p className="text-xs text-zinc-500 italic">
                    Sem aluno vinculado
                  </p>
                )}
              </div>

              <div className="pt-3 mt-2 border-t border-[#303238] flex items-center justify-between text-xs font-semibold text-[#10B981] group-hover:text-emerald-300 transition-colors">
                <span>Abrir ficha</span>
                <span className="group-hover:translate-x-1.5 transition-transform font-bold">
                  →
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
