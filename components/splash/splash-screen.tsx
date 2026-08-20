import { TrevoOneLogo } from "../brand/trevo-one-logo";
import { SplashRedirect } from "./splash-redirect";

export function SplashScreen() {
  return (
    <main className="min-h-dvh w-full flex flex-col items-center justify-between p-6 py-12 bg-[var(--background)] text-[var(--text-primary)] selection:bg-[var(--brand-soft)] selection:text-[var(--brand-foreground)]">
      <SplashRedirect />
      <div className="aria-hidden:true" />

      {/* Main Content Center */}
      <div className="flex flex-col items-center text-center max-w-sm w-full px-4 space-y-6">
        <div className="shrink-0 transition-transform duration-200 hover:scale-[1.02]">
          <TrevoOneLogo priority showWordmark size={44} />
        </div>

        <div className="space-y-2">
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-normal leading-relaxed max-w-[280px] sm:max-w-xs mx-auto">
            Saúde, performance e acompanhamento em um só lugar.
          </p>
        </div>
      </div>

      {/* Discrete Loading Indicator */}
      <div className="flex items-center justify-center space-x-2 py-4" aria-label="Carregando">
        <span className="w-2 h-2 rounded-full bg-[var(--brand)] opacity-75 animate-bounce [animation-delay:-0.3s] motion-reduce:animate-none" />
        <span className="w-2 h-2 rounded-full bg-[var(--brand)] opacity-75 animate-bounce [animation-delay:-0.15s] motion-reduce:animate-none" />
        <span className="w-2 h-2 rounded-full bg-[var(--brand)] opacity-75 animate-bounce motion-reduce:animate-none" />
      </div>
    </main>
  );
}

