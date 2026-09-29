import React from "react";
import { TrevoOneLogo } from "@/components/brand/trevo-one-logo";
import { LoginPhotoCarousel } from "./login-photo-carousel";

export function LoginBrandPanel() {
  return (
    <div className="relative w-full h-full flex flex-col justify-between p-8 sm:p-10 lg:p-12 xl:p-14 overflow-hidden">
      {/* Background Ambience & Lighting */}
      <div
        className="absolute -top-32 -left-32 w-96 h-96 bg-[#00E676]/[0.05] rounded-full blur-3xl pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute bottom-0 left-1/4 w-[500px] h-[350px] bg-[#00E676]/[0.03] rounded-full blur-[100px] pointer-events-none"
        aria-hidden="true"
      />

      {/* Top Header Section: Logo + Pill Badge */}
      <div className="relative z-10 space-y-4">
        <div>
          <TrevoOneLogo size={36} showWordmark priority />
        </div>

        {/* Pill Badge matching reference exactly */}
        <div>
          <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-[10px] sm:text-[11px] font-semibold tracking-[0.16em] uppercase bg-[#0e1015]/90 text-neutral-300 border border-neutral-800/80 shadow-sm">
            <span>SAÚDE</span>
            <span className="text-[#00E676] text-xs leading-none">&bull;</span>
            <span>TREINO</span>
            <span className="text-[#00E676] text-xs leading-none">&bull;</span>
            <span>NUTRIÇÃO</span>
            <span className="text-[#00E676] text-xs leading-none">&bull;</span>
            <span>EVOLUÇÃO</span>
          </span>
        </div>
      </div>

      {/* Hero Content & Photo Carousel */}
      <div className="relative z-10 my-auto py-3 space-y-5">
        {/* Hero Headings with Editorial Serif Typography */}
        <div className="space-y-2 max-w-xl">
          <h1 className="text-3xl sm:text-4xl lg:text-[44px] xl:text-[50px] font-bold tracking-tight text-white font-editorial leading-[1.12]">
            Sua evolução{" "}
            <span className="text-[#00E676] drop-shadow-[0_0_25px_rgba(0,230,118,0.25)]">
              começa aqui.
            </span>
          </h1>

          <p className="text-sm sm:text-base lg:text-lg font-medium text-neutral-200 pt-0.5">
            Treino, nutrição e acompanhamento em um só lugar.
          </p>

          <p className="text-xs sm:text-sm text-neutral-400 font-normal leading-relaxed pt-0.5">
            Mais disciplina, mais saúde e uma versão melhor de você,<br className="hidden sm:inline" />
            com o apoio da tecnologia.
          </p>
        </div>

        {/* Real Photo Carousel */}
        <div className="pt-2">
          <LoginPhotoCarousel />
        </div>
      </div>

      {/* Bottom Footer Section */}
      <div className="relative z-10 pt-4 border-t border-neutral-900/90 flex items-center justify-between text-xs">
        <p className="text-neutral-400 font-medium tracking-wide">
          A evolução na palma da sua mão.
        </p>
        <span className="font-mono text-neutral-600 tracking-wider text-[11px]">
          TREVO ONE &bull; 2026
        </span>
      </div>
    </div>
  );
}
