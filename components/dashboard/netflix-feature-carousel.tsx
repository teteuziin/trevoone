"use client";

import React, { useState, useEffect, useCallback, useSyncExternalStore } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";

export interface CarouselSlide {
  id: string;
  tag: string;
  tagColor?: "brand" | "emerald" | "amber" | "blue" | "neutral";
  title: string;
  description: string;
  ctaText: string;
  ctaHref: string;
  imageUrl: string;
  meta?: string;
}

export interface NetflixFeatureCarouselProps {
  slides: CarouselSlide[];
  consultancySlug?: string;
  className?: string;
  autoSlideIntervalMs?: number;
}

function subscribeReducedMotion(callback: () => void) {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  mediaQuery.addEventListener("change", callback);
  return () => mediaQuery.removeEventListener("change", callback);
}

function getReducedMotionSnapshot() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function getReducedMotionServerSnapshot() {
  return false;
}

export function NetflixFeatureCarousel({
  slides,
  className = "",
  autoSlideIntervalMs = 5500,
}: NetflixFeatureCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);

  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot
  );

  const total = slides.length;

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % total);
  }, [total]);

  const goToPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + total) % total);
  }, [total]);

  const goToSlide = (idx: number) => {
    setCurrentIndex(idx);
  };

  // Auto-slide timer (resets whenever currentIndex, isPaused or reducedMotion changes)
  useEffect(() => {
    if (reducedMotion || isPaused || total <= 1) return;

    const timer = setInterval(() => {
      goToNext();
    }, autoSlideIntervalMs);

    return () => clearInterval(timer);
  }, [goToNext, autoSlideIntervalMs, isPaused, reducedMotion, total, currentIndex]);

  // Touch handlers for mobile swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsPaused(true);
    setTouchStartX(e.touches[0].clientX);
    setTouchStartY(e.touches[0].clientY);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    setIsPaused(false);
    if (touchStartX === null || touchStartY === null) return;

    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;

    // Horizontal swipe threshold: 45px, with horizontal dominance
    if (Math.abs(deltaX) > 45 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2) {
      if (deltaX < 0) {
        goToNext();
      } else {
        goToPrev();
      }
    }

    setTouchStartX(null);
    setTouchStartY(null);
  };

  if (total === 0) return null;

  const currentSlide = slides[currentIndex];

  const tagColorClass =
    currentSlide.tagColor === "emerald"
      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
      : currentSlide.tagColor === "amber"
      ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
      : currentSlide.tagColor === "blue"
      ? "bg-sky-500/20 text-sky-300 border-sky-500/30"
      : currentSlide.tagColor === "brand"
      ? "bg-[var(--brand)] text-white border-transparent"
      : "bg-white/15 text-neutral-200 border-white/20";

  return (
    <section
      aria-label="Destaques do Hub"
      className={`relative rounded-3xl overflow-hidden border border-neutral-800/80 shadow-lg min-h-[360px] sm:min-h-[420px] md:min-h-[440px] flex flex-col justify-end p-6 sm:p-8 lg:p-10 bg-neutral-950 select-none group ${className}`.trim()}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* 1. Background Editorial Image with Fade Transition */}
      <div className="absolute inset-0 z-0 bg-neutral-950">
        <Image
          key={currentSlide.imageUrl}
          src={currentSlide.imageUrl}
          alt=""
          aria-hidden="true"
          unoptimized
          fill
          priority
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 90vw, 1120px"
          className="object-cover object-[center_35%] opacity-85 transition-transform duration-700 hover:scale-[1.015]"
        />

        {/* Cinematic Multi-Layer Dark Scrim Overlays for pristine typography contrast in Light & Dark */}
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/80 to-neutral-950/30 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-neutral-950/95 via-neutral-950/75 to-transparent hidden sm:block pointer-events-none" />
      </div>

      {/* 2. Slide Content */}
      <div className="relative z-10 space-y-4 sm:space-y-5 max-w-2xl">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] sm:text-[11px] font-bold uppercase tracking-wider border backdrop-blur-md ${tagColorClass}`}
          >
            {currentSlide.tag}
          </span>
          {currentSlide.meta && (
            <span className="text-[11px] text-neutral-300 font-medium">
              {currentSlide.meta}
            </span>
          )}
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight leading-[1.15] font-heading">
            {currentSlide.title}
          </h2>
          <p className="text-xs sm:text-sm md:text-base text-neutral-300 max-w-xl line-clamp-2 font-normal leading-relaxed">
            {currentSlide.description}
          </p>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <Link href={currentSlide.ctaHref}>
            <Button
              variant="primary"
              size="md"
              className="font-bold min-h-[44px] px-6 shadow-sm flex items-center gap-2"
            >
              <span>{currentSlide.ctaText}</span>
              <span aria-hidden="true">→</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* 3. Netflix-Style Progress Bar & Slide Thumbnails (Bottom Right) */}
      <div className="relative z-10 pt-6 sm:pt-8 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-neutral-800/60 mt-6">
        <div className="flex items-center gap-2">
          {slides.map((slide, idx) => {
            const isActive = idx === currentIndex;
            return (
              <button
                key={slide.id}
                type="button"
                onClick={() => goToSlide(idx)}
                aria-label={`Slide ${idx + 1}: ${slide.title}`}
                className={`relative h-1.5 sm:h-2 rounded-full transition-all duration-300 overflow-hidden cursor-pointer ${
                  isActive
                    ? "w-10 sm:w-12 bg-neutral-700"
                    : "w-4 sm:w-5 bg-neutral-800 hover:bg-neutral-600"
                }`}
              >
                {isActive && (
                  <span
                    className={`absolute inset-0 bg-[var(--brand)] rounded-full ${
                      !reducedMotion && !isPaused ? "animate-netflix-progress" : ""
                    }`}
                    style={{
                      animationDuration: `${autoSlideIntervalMs}ms`,
                      animationPlayState: isPaused ? "paused" : "running",
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* 4. Desktop Navigation Chevrons */}
        <div className="hidden sm:flex items-center gap-2">
          <button
            type="button"
            onClick={goToPrev}
            aria-label="Slide anterior"
            className="w-8 h-8 rounded-full bg-neutral-900/80 hover:bg-neutral-800 text-neutral-200 border border-neutral-700/60 flex items-center justify-center transition-colors min-h-[32px] min-w-[32px]"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <button
            type="button"
            onClick={goToNext}
            aria-label="Próximo slide"
            className="w-8 h-8 rounded-full bg-neutral-900/80 hover:bg-neutral-800 text-neutral-200 border border-neutral-700/60 flex items-center justify-center transition-colors min-h-[32px] min-w-[32px]"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}
