import React from "react";
import { TrevoOneLogo } from "@/components/brand/trevo-one-logo";
import { LoginBrandPanel } from "./login-brand-panel";
import { LoginAudioController } from "./login-audio-controller";
import { LoginForm } from "./login-form";
import { LoginPhotoCarousel } from "./login-photo-carousel";

interface LoginShellV2Props {
  returnTo?: string;
  resetSuccess?: boolean;
}

export function LoginShellV2({ returnTo, resetSuccess }: LoginShellV2Props) {
  return (
    <main className="min-h-screen w-full flex flex-col lg:flex-row bg-[#060709] text-white selection:bg-[#00E676]/20 selection:text-[#00E676] relative overflow-x-hidden">
      {/* Editorial Serif font injection + Hide beta watermark on login */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;0,800;1,600;1,700&display=swap');
        .font-editorial {
          font-family: 'Playfair Display', Georgia, Cambria, 'Times New Roman', Times, serif;
          letter-spacing: -0.02em;
        }
        [data-trevo-beta-watermark] {
          display: none !important;
        }
      `}</style>

      {/* Abstract Glowing Emerald Orbital Arc across the background */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none opacity-25 hidden lg:block"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M -100,200 Q 600,-50 900,450 T 1800,400"
          stroke="url(#arcGreenGrad)"
          strokeWidth="1.5"
          strokeDasharray="4 4"
        />
        <path
          d="M 200,800 Q 800,700 1100,300 T 1900,100"
          stroke="url(#arcGreenGrad2)"
          strokeWidth="1.2"
        />
        <defs>
          <linearGradient id="arcGreenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00E676" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#00E676" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#00E676" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="arcGreenGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00E676" stopOpacity="0" />
            <stop offset="50%" stopColor="#00E676" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#00E676" stopOpacity="0.05" />
          </linearGradient>
        </defs>
      </svg>

      {/* ------------------------------------------------------------- */}
      {/* DESKTOP BRAND EXPERIENCE (58-60% Left Panel)                  */}
      {/* ------------------------------------------------------------- */}
      <section
        aria-label="Experiência da Marca Trevo One"
        className="hidden lg:flex lg:w-[58%] xl:w-[60%] lg:h-screen lg:overflow-hidden border-r border-white/[0.04] bg-[#060709] relative"
      >
        <LoginBrandPanel />
      </section>

      {/* ------------------------------------------------------------- */}
      {/* LOGIN CARD & INTERACTIVE PANEL (40-42% Right Panel)           */}
      {/* ------------------------------------------------------------- */}
      <section
        aria-label="Autenticação de Usuário"
        className="w-full lg:w-[42%] xl:w-[40%] flex flex-col justify-between p-5 sm:p-8 lg:p-10 xl:p-14 min-h-screen lg:h-screen lg:overflow-y-auto relative pt-[calc(1.25rem+env(safe-area-inset-top,0px))] pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] bg-[#060709]"
      >
        {/* Subtle Ambient Light Glow in Right Panel */}
        <div
          className="absolute -top-24 -right-24 w-80 h-80 bg-[#00E676]/[0.04] rounded-full blur-3xl pointer-events-none"
          aria-hidden="true"
        />

        {/* Top Header Bar: Logo (Mobile/Tablet) & Audio Toggle (Right Aligned) */}
        <header className="relative z-10 flex items-center justify-between w-full">
          <div className="lg:hidden flex items-center">
            <TrevoOneLogo size={32} showWordmark priority />
          </div>
          <div className="hidden lg:block">
            {/* Desktop subtle section indicator matching reference clean standard */}
            <span className="text-[10px] font-mono text-neutral-600 tracking-widest uppercase">
              ACESSO SEGURO
            </span>
          </div>

          {/* Minimalist Audio Controller Pill */}
          <div className="ml-auto">
            <LoginAudioController />
          </div>
        </header>

        {/* Mobile-Only Hero & Photo Carousel Showcase */}
        <div className="lg:hidden relative z-10 my-4 space-y-4">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10px] font-semibold tracking-wider uppercase bg-[#0e1015] text-neutral-300 border border-neutral-800">
              <span>SAÚDE</span>
              <span className="text-[#00E676]">&bull;</span>
              <span>TREINO</span>
              <span className="text-[#00E676]">&bull;</span>
              <span>NUTRIÇÃO</span>
              <span className="text-[#00E676]">&bull;</span>
              <span>EVOLUÇÃO</span>
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-editorial">
              Sua evolução{" "}
              <span className="text-[#00E676]">começa aqui.</span>
            </h1>
            <p className="text-xs text-neutral-400">
              Treino, nutrição e acompanhamento em um só lugar.
            </p>
          </div>

          <div className="pt-1">
            <LoginPhotoCarousel />
          </div>
        </div>

        {/* Central Form Container */}
        <div className="relative z-10 w-full max-w-[420px] sm:max-w-[440px] mx-auto my-auto py-4 sm:py-6">
          {/* Login Form Card matching reference */}
          <div className="rounded-3xl bg-[#0c0d12]/95 border border-white/[0.07] p-6 sm:p-9 shadow-2xl shadow-black/90 backdrop-blur-xl">
            <LoginForm returnTo={returnTo} resetSuccess={resetSuccess} />
          </div>
        </div>

        {/* Footer: Official Slogan & Platform Notice matching reference */}
        <footer className="relative z-10 pt-4 flex flex-col items-center justify-center text-center space-y-1">
          <p className="text-xs font-medium text-neutral-400 tracking-wide select-none">
            A evolução na palma da sua mão.
          </p>
          <p className="text-[11px] text-neutral-600 font-normal select-none">
            Trevo One &bull; Plataforma para consultoria de saúde e treino
          </p>
        </footer>
      </section>
    </main>
  );
}
