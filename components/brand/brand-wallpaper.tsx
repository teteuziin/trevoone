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



      {/* 3. Marca d'água focal removida para eliminar aparência de template decorativo */}

    </div>
  );
}
