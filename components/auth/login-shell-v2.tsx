import React from "react";
import { TrevoOneLogo } from "@/components/brand/trevo-one-logo";
import { LoginBrandPanel } from "./login-brand-panel";
import { LoginAudioController } from "./login-audio-controller";
import { LoginForm } from "./login-form";

interface LoginShellV2Props {
  returnTo?: string;
  resetSuccess?: boolean;
}

export function LoginShellV2({ returnTo, resetSuccess }: LoginShellV2Props) {
  return (
    <main className="min-h-dvh w-full flex flex-col lg:flex-row bg-[#050608] text-white selection:bg-emerald-500/20 selection:text-emerald-300 relative overflow-x-hidden">
      {/* ------------------------------------------------------------- */}
      {/* DESKTOP BRAND EXPERIENCE (55% Left Panel)                     */}
      {/* ------------------------------------------------------------- */}
      <section
        aria-label="Experiência da Marca Trevo One"
        className="hidden lg:flex lg:w-[54%] xl:w-[56%] border-r border-neutral-900/80 bg-neutral-950/60 relative"
      >
        <LoginBrandPanel />
      </section>

      {/* ------------------------------------------------------------- */}
      {/* LOGIN CARD & INTERACTIVE PANEL (45% Right Panel & Mobile View) */}
      {/* ------------------------------------------------------------- */}
      <section
        aria-label="Autenticação de Usuário"
        className="w-full lg:w-[46%] xl:w-[44%] flex flex-col justify-between p-5 sm:p-8 lg:p-12 xl:p-16 min-h-dvh relative pt-[calc(1.25rem+env(safe-area-inset-top,0px))] pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]"
      >
        {/* Background Ambience on Right Panel (Soft Depth) */}
        <div className="absolute inset-0 bg-radial from-emerald-950/10 via-transparent to-transparent pointer-events-none" aria-hidden="true" />

        {/* Top Header Bar: Logo (Mobile/Tablet) & Audio Toggle (All Screens) */}
        <header className="relative z-10 flex items-center justify-between w-full">
          <div className="lg:hidden flex items-center">
            <TrevoOneLogo size={34} showWordmark priority />
          </div>
          <div className="hidden lg:block">
            {/* Desktop spacer to keep audio right-aligned */}
            <span className="text-[11px] font-mono text-neutral-600 tracking-wider">
              ACESSO RESTRITO
            </span>
          </div>

          {/* Minimalist Audio Controller */}
          <div className="ml-auto">
            <LoginAudioController />
          </div>
        </header>

        {/* Central Form Container */}
        <div className="relative z-10 w-full max-w-[420px] sm:max-w-[440px] mx-auto my-auto py-6 sm:py-8">
          {/* Mobile Pre-Headline */}
          <div className="lg:hidden mb-4">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wider uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Sua evolução começa aqui
            </span>
          </div>

          {/* Login Form Card */}
          <div className="rounded-2xl sm:bg-neutral-900/40 sm:backdrop-blur-md sm:border sm:border-neutral-800/80 sm:p-8 sm:shadow-2xl sm:shadow-black/60">
            <LoginForm returnTo={returnTo} resetSuccess={resetSuccess} />
          </div>
        </div>

        {/* Footer: Official Slogan & Safe-area Notice */}
        <footer className="relative z-10 pt-4 flex flex-col items-center justify-center text-center space-y-1">
          <p className="text-xs font-medium text-neutral-400 tracking-wide select-none">
            A evolução na palma da sua mão.
          </p>
          <p className="text-[11px] text-neutral-600 font-normal select-none">
            Trevo One &bull; Plataforma para consultorias de saúde e treino
          </p>
        </footer>
      </section>
    </main>
  );
}
