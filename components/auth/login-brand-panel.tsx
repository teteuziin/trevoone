import React from "react";
import { TrevoOneLogo } from "@/components/brand/trevo-one-logo";

export function LoginBrandPanel() {
  return (
    <div className="relative flex flex-col justify-between h-full p-8 lg:p-12 xl:p-16 overflow-hidden select-none">
      {/* Background Ambience: Deep Tech Grid & Restrained Emerald Auras */}
      <div className="absolute inset-0 bg-[#060709] pointer-events-none" aria-hidden="true">
        {/* Subtle Tech Grid Pattern */}
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #34d399 1px, transparent 0)`,
            backgroundSize: "32px 32px",
          }}
        />

        {/* Ambient Emerald Aura (Soft Top Glow) */}
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-emerald-500/10 blur-[120px]" />

        {/* Ambient Emerald Aura (Bottom Center Glow) */}
        <div className="absolute bottom-10 right-10 w-[420px] h-[420px] rounded-full bg-emerald-600/[0.08] blur-[140px]" />
      </div>

      {/* Top Section: Logo & Badge */}
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <TrevoOneLogo size={42} showWordmark priority />
        </div>
        <div className="hidden sm:inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-semibold tracking-wider uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Health & Fitness Tech
        </div>
      </div>

      {/* Center Section: Headlines & Interactive Preview Composition */}
      <div className="relative z-10 my-auto py-10 max-w-xl">
        {/* Headlines */}
        <div className="space-y-3 mb-8">
          <h1 className="text-3xl sm:text-4xl xl:text-5xl font-extrabold tracking-tight text-white font-heading leading-[1.15]">
            Sua evolução começa aqui.
          </h1>
          <p className="text-base sm:text-lg text-neutral-400 font-normal leading-relaxed">
            Treino, nutrição e acompanhamento em um só lugar.
          </p>
        </div>

        {/* Visual Brand Composition: Authentic Trevo One Platform Widgets */}
        <div className="space-y-3.5 relative">
          {/* Card 1: Treino */}
          <div className="group relative rounded-2xl bg-neutral-900/60 backdrop-blur-xl border border-neutral-800/80 p-4 transition-all duration-300 hover:border-emerald-500/40 hover:bg-neutral-900/80 shadow-lg shadow-black/40">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-white tracking-tight">Rotina A • Hipertrofia & Força</h2>
                  <p className="text-xs text-neutral-400">Peito, Ombros e Tríceps</p>
                </div>
              </div>
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                5 de 5 concluídos
              </span>
            </div>
            <div className="w-full bg-neutral-800/80 h-1.5 rounded-full overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-500 to-emerald-400 h-full rounded-full w-full" />
            </div>
          </div>

          {/* Card 2: Nutrição */}
          <div className="group relative rounded-2xl bg-neutral-900/60 backdrop-blur-xl border border-neutral-800/80 p-4 transition-all duration-300 hover:border-emerald-500/40 hover:bg-neutral-900/80 shadow-lg shadow-black/40">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-white tracking-tight">Plano Alimentar Ativo</h2>
                  <p className="text-xs text-neutral-400">Meta: 2.450 kcal &bull; Alta Proteína</p>
                </div>
              </div>
              <span className="text-xs font-semibold text-emerald-400">
                100% Meta Diária
              </span>
            </div>
            <div className="flex items-center gap-1.5 pt-1 text-[11px] text-neutral-400">
              <span className="px-2 py-0.5 rounded bg-neutral-800/90 text-neutral-300 font-mono">180g P</span>
              <span className="px-2 py-0.5 rounded bg-neutral-800/90 text-neutral-300 font-mono">260g C</span>
              <span className="px-2 py-0.5 rounded bg-neutral-800/90 text-neutral-300 font-mono">65g G</span>
              <span className="ml-auto text-emerald-400/90 text-[10px] uppercase font-semibold">Taco &amp; USDA</span>
            </div>
          </div>

          {/* Card 3: Acompanhamento & Consistência */}
          <div className="group relative rounded-2xl bg-neutral-900/60 backdrop-blur-xl border border-neutral-800/80 p-4 transition-all duration-300 hover:border-emerald-500/40 hover:bg-neutral-900/80 shadow-lg shadow-black/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-white tracking-tight">Check-in &amp; Evolução</h2>
                  <p className="text-xs text-neutral-400">Acompanhamento contínuo em tempo real</p>
                </div>
              </div>
              <div className="text-right">
                <span className="block text-xs font-bold text-white tracking-tight">Consistência 100%</span>
                <span className="text-[10px] text-emerald-400 font-medium">Radar atualizado</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: Official Slogan */}
      <div className="relative z-10 pt-6 border-t border-neutral-900 flex items-center justify-between">
        <p className="text-sm font-medium text-neutral-400 tracking-wide">
          A evolução na palma da sua mão.
        </p>
        <span className="text-[11px] text-neutral-600 font-mono tracking-wider">
          TREVO ONE &bull; 2026
        </span>
      </div>
    </div>
  );
}
