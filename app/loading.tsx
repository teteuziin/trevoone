import { TrevoOneLogo } from "@/components/brand/trevo-one-logo";

export default function RootLoading() {
  return (
    <div
      className="min-h-dvh w-full flex flex-col items-center justify-center p-6 bg-transparent text-[var(--text-primary)]"
      aria-busy="true"
      aria-label="Carregando"
    >
      <div className="flex flex-col items-center text-center max-w-sm w-full px-4 space-y-5">
        <div className="shrink-0 transition-opacity duration-300 opacity-90">
          <TrevoOneLogo priority showWordmark size={40} />
        </div>

        <div className="flex items-center justify-center space-x-1.5 py-2" aria-hidden="true">
          <span className="w-2 h-2 rounded-full bg-[var(--brand)] opacity-75 animate-bounce [animation-delay:-0.3s] motion-reduce:animate-none" />
          <span className="w-2 h-2 rounded-full bg-[var(--brand)] opacity-75 animate-bounce [animation-delay:-0.15s] motion-reduce:animate-none" />
          <span className="w-2 h-2 rounded-full bg-[var(--brand)] opacity-75 animate-bounce motion-reduce:animate-none" />
        </div>
      </div>
    </div>
  );
}
