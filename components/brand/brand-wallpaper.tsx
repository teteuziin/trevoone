import React from "react";

/**
 * BrandWallpaper
 * Assinatura visual institucional Trevo One discreta, elegante e responsiva.
 * Integra:
 * - Auras atmosféricas sutis de profundidade (esmeralda suave, sem neon)
 * - Padrão vetorial contínuo com a geometria do trevo de 4 folhas e micro-wordmark "TREVO ONE"
 * - Marca d'água focal assimétrica e equilibrada (adaptada para mobile 390px e desktop)
 * - Calibração precisa de contraste: Dark 4-7%, Light 2.5-5%
 * - Camada 100% não-intrusiva (fixed, pointer-events: none, z-0)
 */
export function BrandWallpaper() {
  return (
    <div
      data-trevo-wallpaper="true"
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none"
      aria-hidden="true"
    >
      {/* 1. Profundidade e Iluminação Atmosférica (Auras suaves) */}
      <div
        className="absolute -top-32 -left-20 w-[460px] h-[460px] rounded-full blur-[130px] transition-opacity duration-300"
        style={{
          backgroundColor: "var(--wallpaper-aura-top, rgba(0, 168, 89, 0.05))",
        }}
      />
      <div
        className="absolute top-1/3 -right-24 w-[420px] h-[420px] rounded-full blur-[150px] transition-opacity duration-300"
        style={{
          backgroundColor: "var(--wallpaper-aura-bottom, rgba(0, 168, 89, 0.035))",
        }}
      />
      <div
        className="absolute -bottom-36 left-1/4 w-[480px] h-[480px] rounded-full blur-[140px] transition-opacity duration-300"
        style={{
          backgroundColor: "var(--wallpaper-aura-bottom, rgba(0, 168, 89, 0.025))",
        }}
      />



      {/* 3. Marca d'Água Focal Orgânica (Bespoke Watermark) */}
      {/* No mobile (390px) posicionada com precisão no terço superior direito */}
      {/* No desktop escala harmoniosamente sem invadir os cards centrais */}
      <div className="absolute top-10 right-[-30px] sm:right-6 lg:right-16 w-[260px] sm:w-[320px] lg:w-[420px] h-[260px] sm:h-[320px] lg:h-[420px] pointer-events-none">
        <svg
          viewBox="0 0 200 200"
          className="w-full h-full transform -rotate-12 transition-opacity duration-300"
          style={{
            color: "var(--wallpaper-watermark-color, #18181b)",
            opacity: "var(--wallpaper-watermark-opacity, 0.05)",
          }}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
        >
          {/* Folhas orgânicas contornadas */}
          <path d="M 100,100 C 75,65 60,35 100,20 C 140,35 125,65 100,100" />
          <path d="M 100,100 C 135,75 165,60 180,100 C 165,140 135,125 100,100" />
          <path d="M 100,100 C 125,135 140,165 100,180 C 60,165 75,135 100,100" />
          <path d="M 100,100 C 65,125 35,140 20,100 C 35,60 65,75 100,100" />
          {/* Halo geométrico interno */}
          <circle cx="100" cy="100" r="14" strokeWidth="0.8" strokeDasharray="2 3" />
          <circle cx="100" cy="100" r="3.5" fill="currentColor" stroke="none" />
        </svg>
      </div>

      {/* 4. Selo de Canto / Rodapé Arquitetural (Desktop / Tablet) */}
      <div
        className="hidden sm:flex absolute bottom-6 right-8 items-center gap-2 font-mono tracking-[0.22em] text-[9.5px] font-bold uppercase transition-opacity duration-300"
        style={{
          color: "var(--wallpaper-watermark-color, #18181b)",
          opacity: "var(--wallpaper-watermark-opacity, 0.05)",
        }}
      >
        <div className="w-1.5 h-1.5 rounded-full bg-current" />
        <span>TREVO ONE</span>
        <span className="text-[8px] opacity-60">SYSTEM</span>
      </div>
    </div>
  );
}
