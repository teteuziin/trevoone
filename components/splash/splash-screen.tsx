import { TrevoOneLogo } from "../brand/trevo-one-logo";

export function SplashScreen() {
  return (
    <main className="min-h-svh w-full flex flex-col items-center justify-between p-6 py-12 bg-white text-zinc-900 selection:bg-[#00A859]/10 selection:text-[#00A859]">
      {/* Top spacing element for vertical centering balance */}
      <div className="aria-hidden:true" />

      {/* Main Content Center */}
      <div className="flex flex-col items-center text-center max-w-sm w-full px-4 space-y-6">
        {/* Logo Container with responsive size */}
        <div className="w-[140px] sm:w-[180px] transition-all duration-300">
          <TrevoOneLogo priority size={180} />
        </div>

        {/* Brand Name & Subtitle */}
        <div className="space-y-2.5">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-900">
            Trevo One
          </h1>
          <p className="text-sm sm:text-base text-zinc-500 font-normal leading-relaxed max-w-[280px] sm:max-w-xs mx-auto">
            Saúde, performance e acompanhamento em um só lugar.
          </p>
        </div>
      </div>

      {/* Discrete Loading Indicator */}
      <div className="flex items-center justify-center space-x-2 py-4" aria-label="Carregando">
        <span className="w-2 h-2 rounded-full bg-[#00A859] opacity-75 animate-bounce [animation-delay:-0.3s] motion-reduce:animate-none" />
        <span className="w-2 h-2 rounded-full bg-[#00A859] opacity-75 animate-bounce [animation-delay:-0.15s] motion-reduce:animate-none" />
        <span className="w-2 h-2 rounded-full bg-[#00A859] opacity-75 animate-bounce motion-reduce:animate-none" />
      </div>
    </main>
  );
}
