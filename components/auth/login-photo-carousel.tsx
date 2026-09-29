"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";

interface SlideItem {
  id: string;
  title: string;
  text: string;
  image: string;
  alt: string;
}

const SLIDES: SlideItem[] = [
  {
    id: "treine",
    title: "TREINE",
    text: "Mais do que exercícios,\nhá um propósito.",
    image: "/images/login/slide-1-treine.webp",
    alt: "Pessoa treinando com halteres na academia",
  },
  {
    id: "nutra-se",
    title: "NUTRA-SE",
    text: "Energia real para\nresultados reais.",
    image: "/images/login/slide-2-nutra-se.webp",
    alt: "Alimentação saudável e nutritiva",
  },
  {
    id: "evolua",
    title: "EVOLUA",
    text: "Pequenas escolhas,\ngrandes resultados.",
    image: "/images/login/slide-3-evolua.webp",
    alt: "Estilo de vida saudável e evolução",
  },
  {
    id: "disciplina",
    title: "DISCIPLINA",
    text: "Hoje mais forte\ndo que ontem.",
    image: "/images/login/slide-4-disciplina.webp",
    alt: "Treino de força e disciplina",
  },
];

const AUTOPLAY_INTERVAL_MS = 6000;

export function LoginPhotoCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const touchStartXRef = useRef<number | null>(null);

  const resetAutoplay = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (!isPaused) {
      timerRef.current = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % SLIDES.length);
      }, AUTOPLAY_INTERVAL_MS);
    }
  }, [isPaused]);

  useEffect(() => {
    resetAutoplay();
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [resetAutoplay]);

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
    resetAutoplay();
  };

  const goToPrev = () => {
    setCurrentIndex((prev) => (prev - 1 + SLIDES.length) % SLIDES.length);
    resetAutoplay();
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % SLIDES.length);
    resetAutoplay();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartXRef.current;
    if (Math.abs(deltaX) > 40) {
      if (deltaX > 0) {
        goToPrev();
      } else {
        goToNext();
      }
    }
    touchStartXRef.current = null;
  };

  const prevIndex = (currentIndex - 1 + SLIDES.length) % SLIDES.length;
  const nextIndex = (currentIndex + 1) % SLIDES.length;
  const next2Index = (currentIndex + 2) % SLIDES.length;

  return (
    <div
      className="relative w-full max-w-3xl select-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      aria-roledescription="carrossel"
      aria-label="Carrossel Visual Trevo One"
    >
      {/* Horizontal Multi-Card Stage */}
      <div className="relative flex items-center justify-start overflow-hidden py-2 -mx-4 sm:-mx-6 px-4 sm:px-6">
        {/* Previous Card (Left Peeking) */}
        <div
          onClick={goToPrev}
          className="relative shrink-0 w-[130px] sm:w-[160px] lg:w-[150px] xl:w-[180px] h-[210px] sm:h-[250px] xl:h-[280px] rounded-2xl overflow-hidden cursor-pointer opacity-40 hover:opacity-75 transition-all duration-500 transform -translate-x-6 sm:-translate-x-4 scale-90 border border-white/[0.06] shadow-xl shadow-black/80"
          style={{ willChange: "transform, opacity" }}
        >
          <Image
            src={SLIDES[prevIndex].image}
            alt={SLIDES[prevIndex].alt}
            fill
            sizes="(max-width: 768px) 160px, 180px"
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent p-3.5 sm:p-4 flex flex-col justify-end">
            <span className="text-xs font-bold tracking-wider text-white uppercase font-sans">
              {SLIDES[prevIndex].title}
            </span>
            <p className="text-[10px] text-neutral-300 font-normal leading-tight mt-1 whitespace-pre-line">
              {SLIDES[prevIndex].text}
            </p>
          </div>
        </div>

        {/* Active Card (Center Focus - Large) */}
        <div className="relative shrink-0 z-20 w-[270px] sm:w-[330px] lg:w-[320px] xl:w-[370px] h-[250px] sm:h-[295px] xl:h-[330px] rounded-2xl overflow-hidden border border-white/[0.12] shadow-2xl shadow-black/90 transition-all duration-500 scale-100">
          <Image
            src={SLIDES[currentIndex].image}
            alt={SLIDES[currentIndex].alt}
            fill
            priority
            sizes="(max-width: 768px) 330px, 380px"
            className="object-cover object-center transition-transform duration-700 hover:scale-105"
          />

          {/* Vignette Overlay matching reference */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/35 to-transparent p-5 sm:p-6 flex flex-col justify-end">
            <h2 className="text-lg sm:text-xl font-black tracking-wider text-white uppercase font-sans">
              {SLIDES[currentIndex].title}
            </h2>
            <p className="text-xs sm:text-sm text-neutral-200 font-normal leading-snug mt-1 whitespace-pre-line">
              {SLIDES[currentIndex].text}
            </p>

            {/* Indicators directly placed at bottom of active card matching reference */}
            <div className="flex items-center gap-1.5 pt-3" role="tablist" aria-label="Indicadores do carrossel">
              {SLIDES.map((slide, index) => {
                const isActive = index === currentIndex;
                return (
                  <button
                    key={slide.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    aria-label={`Ir para slide ${slide.title}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      goToSlide(index);
                    }}
                    className={`h-1 rounded-full transition-all duration-300 cursor-pointer ${
                      isActive
                        ? "w-6 bg-[#00E676] shadow-[0_0_10px_rgba(0,230,118,0.6)]"
                        : "w-3 bg-neutral-600/80 hover:bg-neutral-400"
                    }`}
                  />
                );
              })}
            </div>
          </div>

          {/* Floating Left Arrow on Active Card */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              goToPrev();
            }}
            aria-label="Slide anterior"
            className="absolute left-2.5 top-1/2 -translate-y-1/2 z-30 w-8 h-8 rounded-full bg-black/65 hover:bg-black/90 border border-white/20 text-white flex items-center justify-center backdrop-blur-md transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Floating Right Arrow on Active Card */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              goToNext();
            }}
            aria-label="Próximo slide"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 z-30 w-8 h-8 rounded-full bg-black/65 hover:bg-black/90 border border-white/20 text-white flex items-center justify-center backdrop-blur-md transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Next Card 1 (Right Peeking) */}
        <div
          onClick={goToNext}
          className="relative shrink-0 w-[130px] sm:w-[160px] lg:w-[150px] xl:w-[180px] h-[210px] sm:h-[250px] xl:h-[280px] rounded-2xl overflow-hidden cursor-pointer opacity-50 hover:opacity-75 transition-all duration-500 transform translate-x-3 sm:translate-x-4 scale-90 border border-white/[0.06] shadow-xl shadow-black/80"
          style={{ willChange: "transform, opacity" }}
        >
          <Image
            src={SLIDES[nextIndex].image}
            alt={SLIDES[nextIndex].alt}
            fill
            sizes="(max-width: 768px) 160px, 180px"
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent p-3.5 sm:p-4 flex flex-col justify-end">
            <span className="text-xs font-bold tracking-wider text-white uppercase font-sans">
              {SLIDES[nextIndex].title}
            </span>
            <p className="text-[10px] text-neutral-300 font-normal leading-tight mt-1 whitespace-pre-line">
              {SLIDES[nextIndex].text}
            </p>
          </div>
        </div>

        {/* Next Card 2 (Far Right Peeking) */}
        <div
          onClick={() => goToSlide(next2Index)}
          className="hidden sm:block relative shrink-0 w-[120px] lg:w-[130px] xl:w-[160px] h-[190px] xl:h-[250px] rounded-2xl overflow-hidden cursor-pointer opacity-30 hover:opacity-60 transition-all duration-500 transform translate-x-4 sm:translate-x-6 scale-[0.82] border border-white/[0.06] shadow-xl shadow-black/80"
          style={{ willChange: "transform, opacity" }}
        >
          <Image
            src={SLIDES[next2Index].image}
            alt={SLIDES[next2Index].alt}
            fill
            sizes="160px"
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent p-3 flex flex-col justify-end">
            <span className="text-[11px] font-bold tracking-wider text-white/80 uppercase font-sans">
              {SLIDES[next2Index].title}
            </span>
            <p className="text-[9px] text-neutral-400 font-normal leading-tight mt-0.5 whitespace-pre-line">
              {SLIDES[next2Index].text}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
