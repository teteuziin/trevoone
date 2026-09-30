"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";

export interface SlideItem {
  id: string;
  title: string;
  text: string;
  image: string;
  fallbackImage: string;
  alt: string;
}

export const LOGIN_SLIDES: SlideItem[] = [
  {
    id: "treine",
    title: "TREINE",
    text: "Mais do que exercícios,\nhá um propósito.",
    image: "/images/login/slide-1-treine.webp",
    fallbackImage: "/images/student/workout-editorial.webp",
    alt: "Pessoa realizando musculação na academia",
  },
  {
    id: "nutra-se",
    title: "NUTRA-SE",
    text: "Energia real para\nresultados reais.",
    image: "/images/login/slide-2-nutra-se.webp",
    fallbackImage: "/images/nutrition/bowl-editorial.jpg",
    alt: "Refeição saudável, apetitosa e balanceada",
  },
  {
    id: "evolua",
    title: "EVOLUA",
    text: "Pequenas escolhas,\ngrandes resultados.",
    image: "/images/login/slide-3-evolua.webp",
    fallbackImage: "/images/student/hero-athlete.webp",
    alt: "Estilo de vida saudável e evolução",
  },
  {
    id: "disciplina",
    title: "DISCIPLINA",
    text: "Hoje mais forte\ndo que ontem.",
    image: "/images/login/slide-4-disciplina.webp",
    fallbackImage: "/images/personal/coach-cockpit.jpg",
    alt: "Pessoa focada treinando força",
  },
];

const AUTOPLAY_INTERVAL_MS = 6000;

interface LoginPhotoCarouselProps {
  isMobileOnly?: boolean;
}

export function LoginPhotoCarousel({ isMobileOnly = false }: LoginPhotoCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mobileScrollRef = useRef<HTMLDivElement | null>(null);
  const touchStartXRef = useRef<number | null>(null);
  const isUserScrollingRef = useRef(false);

  const resetAutoplay = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (!isPaused) {
      timerRef.current = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % LOGIN_SLIDES.length);
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

  // Sync mobile scroll container when currentIndex changes programmatically
  useEffect(() => {
    if (isMobileOnly && mobileScrollRef.current && !isUserScrollingRef.current) {
      const container = mobileScrollRef.current;
      const card = container.children[currentIndex] as HTMLElement | undefined;
      if (card) {
        const targetLeft = card.offsetLeft - 16;
        container.scrollTo({ left: Math.max(0, targetLeft), behavior: "smooth" });
      }
    }
  }, [currentIndex, isMobileOnly]);

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
    resetAutoplay();
  };

  const goToPrev = () => {
    setCurrentIndex((prev) => (prev - 1 + LOGIN_SLIDES.length) % LOGIN_SLIDES.length);
    resetAutoplay();
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % LOGIN_SLIDES.length);
    resetAutoplay();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsPaused(true);
    isUserScrollingRef.current = true;
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    setIsPaused(false);
    setTimeout(() => {
      isUserScrollingRef.current = false;
    }, 400);

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

  const handleMobileScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const scrollLeft = container.scrollLeft;
    const children = Array.from(container.children) as HTMLElement[];
    let closestIndex = 0;
    let minDiff = Infinity;

    children.forEach((child, idx) => {
      const cardLeft = child.offsetLeft - 16;
      const diff = Math.abs(cardLeft - scrollLeft);
      if (diff < minDiff) {
        minDiff = diff;
        closestIndex = idx;
      }
    });

    if (closestIndex !== currentIndex && minDiff < 45) {
      setCurrentIndex(closestIndex);
    }
  };

  const handleImageError = (slideId: string) => {
    setImageErrors((prev) => ({ ...prev, [slideId]: true }));
  };

  const prevIndex = (currentIndex - 1 + LOGIN_SLIDES.length) % LOGIN_SLIDES.length;
  const nextIndex = (currentIndex + 1) % LOGIN_SLIDES.length;
  const next2Index = (currentIndex + 2) % LOGIN_SLIDES.length;

  // -------------------------------------------------------------
  // MOBILE DEDICATED LAYOUT (~84vw active card + snap peek)
  // -------------------------------------------------------------
  if (isMobileOnly) {
    return (
      <div
        className="relative w-full select-none py-1"
        aria-roledescription="carrossel"
        aria-label="Carrossel Visual Mobile Trevo One"
      >
        {/* Horizontal Native Snap Container */}
        <div
          ref={mobileScrollRef}
          onScroll={handleMobileScroll}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className="flex items-center gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-none px-4 py-2 -mx-4 scroll-smooth"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {LOGIN_SLIDES.map((slide, index) => {
            const hasError = imageErrors[slide.id];
            const imgSrc = hasError ? slide.fallbackImage : slide.image;
            const isActive = index === currentIndex;

            return (
              <div
                key={slide.id}
                onClick={() => goToSlide(index)}
                className={`relative shrink-0 snap-center w-[84vw] max-w-[360px] h-[255px] sm:h-[285px] rounded-2xl overflow-hidden border transition-all duration-300 bg-[#12141a] cursor-pointer ${
                  isActive
                    ? "border-white/[0.16] shadow-2xl shadow-black/90 scale-100"
                    : "border-white/[0.06] opacity-75 scale-[0.98]"
                }`}
              >
                <Image
                  src={imgSrc}
                  alt={slide.alt}
                  fill
                  unoptimized
                  priority={index === 0}
                  sizes="84vw"
                  onError={() => handleImageError(slide.id)}
                  className="object-cover object-center"
                />

                {/* Elegant Vignette Gradient */}
                <div
                  className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent p-4 sm:p-5 flex flex-col justify-end pointer-events-none"
                  aria-hidden="true"
                >
                  <h2 className="text-base sm:text-lg font-black tracking-wider text-white uppercase font-sans">
                    {slide.title}
                  </h2>
                  <p className="text-xs text-neutral-200 font-normal leading-snug mt-1 whitespace-pre-line">
                    {slide.text}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Mobile Carousel Indicators */}
        <div
          className="flex items-center justify-center gap-1.5 pt-2.5 pb-1"
          role="tablist"
          aria-label="Indicadores do carrossel mobile"
        >
          {LOGIN_SLIDES.map((slide, index) => {
            const isActive = index === currentIndex;
            return (
              <button
                key={slide.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-label={`Ir para slide ${slide.title}`}
                onClick={() => goToSlide(index)}
                className={`h-1 rounded-full transition-all duration-300 cursor-pointer ${
                  isActive
                    ? "w-6 bg-[#00E676] shadow-[0_0_10px_rgba(0,230,118,0.6)]"
                    : "w-2.5 bg-neutral-700 hover:bg-neutral-500"
                }`}
              />
            );
          })}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // DESKTOP MULTI-CARD STAGE (Matching Reference Perfectly)
  // -------------------------------------------------------------
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
          className="relative shrink-0 w-[130px] sm:w-[160px] lg:w-[150px] xl:w-[180px] h-[210px] sm:h-[250px] xl:h-[280px] rounded-2xl overflow-hidden cursor-pointer opacity-40 hover:opacity-75 transition-all duration-500 transform -translate-x-6 sm:-translate-x-4 scale-90 border border-white/[0.06] shadow-xl shadow-black/80 bg-[#12141a]"
          style={{ willChange: "transform, opacity" }}
        >
          <Image
            src={imageErrors[LOGIN_SLIDES[prevIndex].id] ? LOGIN_SLIDES[prevIndex].fallbackImage : LOGIN_SLIDES[prevIndex].image}
            alt={LOGIN_SLIDES[prevIndex].alt}
            fill
            unoptimized
            sizes="(max-width: 768px) 160px, 180px"
            onError={() => handleImageError(LOGIN_SLIDES[prevIndex].id)}
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent p-3.5 sm:p-4 flex flex-col justify-end">
            <span className="text-xs font-bold tracking-wider text-white uppercase font-sans">
              {LOGIN_SLIDES[prevIndex].title}
            </span>
            <p className="text-[10px] text-neutral-300 font-normal leading-tight mt-1 whitespace-pre-line">
              {LOGIN_SLIDES[prevIndex].text}
            </p>
          </div>
        </div>

        {/* Active Card (Center Focus - Large) */}
        <div className="relative shrink-0 z-20 w-[270px] sm:w-[330px] lg:w-[320px] xl:w-[370px] h-[250px] sm:h-[295px] xl:h-[330px] rounded-2xl overflow-hidden border border-white/[0.12] shadow-2xl shadow-black/90 transition-all duration-500 scale-100 bg-[#12141a]">
          <Image
            src={imageErrors[LOGIN_SLIDES[currentIndex].id] ? LOGIN_SLIDES[currentIndex].fallbackImage : LOGIN_SLIDES[currentIndex].image}
            alt={LOGIN_SLIDES[currentIndex].alt}
            fill
            unoptimized
            priority
            sizes="(max-width: 768px) 330px, 380px"
            onError={() => handleImageError(LOGIN_SLIDES[currentIndex].id)}
            className="object-cover object-center transition-transform duration-700 hover:scale-105"
          />

          {/* Vignette Overlay matching reference */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/35 to-transparent p-5 sm:p-6 flex flex-col justify-end">
            <h2 className="text-lg sm:text-xl font-black tracking-wider text-white uppercase font-sans">
              {LOGIN_SLIDES[currentIndex].title}
            </h2>
            <p className="text-xs sm:text-sm text-neutral-200 font-normal leading-snug mt-1 whitespace-pre-line">
              {LOGIN_SLIDES[currentIndex].text}
            </p>

            {/* Indicators directly placed at bottom of active card */}
            <div className="flex items-center gap-1.5 pt-3" role="tablist" aria-label="Indicadores do carrossel">
              {LOGIN_SLIDES.map((slide, index) => {
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
          className="relative shrink-0 w-[130px] sm:w-[160px] lg:w-[150px] xl:w-[180px] h-[210px] sm:h-[250px] xl:h-[280px] rounded-2xl overflow-hidden cursor-pointer opacity-50 hover:opacity-75 transition-all duration-500 transform translate-x-3 sm:translate-x-4 scale-90 border border-white/[0.06] shadow-xl shadow-black/80 bg-[#12141a]"
          style={{ willChange: "transform, opacity" }}
        >
          <Image
            src={imageErrors[LOGIN_SLIDES[nextIndex].id] ? LOGIN_SLIDES[nextIndex].fallbackImage : LOGIN_SLIDES[nextIndex].image}
            alt={LOGIN_SLIDES[nextIndex].alt}
            fill
            unoptimized
            sizes="(max-width: 768px) 160px, 180px"
            onError={() => handleImageError(LOGIN_SLIDES[nextIndex].id)}
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent p-3.5 sm:p-4 flex flex-col justify-end">
            <span className="text-xs font-bold tracking-wider text-white uppercase font-sans">
              {LOGIN_SLIDES[nextIndex].title}
            </span>
            <p className="text-[10px] text-neutral-300 font-normal leading-tight mt-1 whitespace-pre-line">
              {LOGIN_SLIDES[nextIndex].text}
            </p>
          </div>
        </div>

        {/* Next Card 2 (Far Right Peeking) */}
        <div
          onClick={() => goToSlide(next2Index)}
          className="hidden sm:block relative shrink-0 w-[120px] lg:w-[130px] xl:w-[160px] h-[190px] xl:h-[250px] rounded-2xl overflow-hidden cursor-pointer opacity-30 hover:opacity-60 transition-all duration-500 transform translate-x-4 sm:translate-x-6 scale-[0.82] border border-white/[0.06] shadow-xl shadow-black/80 bg-[#12141a]"
          style={{ willChange: "transform, opacity" }}
        >
          <Image
            src={imageErrors[LOGIN_SLIDES[next2Index].id] ? LOGIN_SLIDES[next2Index].fallbackImage : LOGIN_SLIDES[next2Index].image}
            alt={LOGIN_SLIDES[next2Index].alt}
            fill
            unoptimized
            sizes="160px"
            onError={() => handleImageError(LOGIN_SLIDES[next2Index].id)}
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent p-3 flex flex-col justify-end">
            <span className="text-[11px] font-bold tracking-wider text-white/80 uppercase font-sans">
              {LOGIN_SLIDES[next2Index].title}
            </span>
            <p className="text-[9px] text-neutral-400 font-normal leading-tight mt-0.5 whitespace-pre-line">
              {LOGIN_SLIDES[next2Index].text}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
