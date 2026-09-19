import Link from "next/link";
import { getCurrentSession, UserSession } from "@/lib/auth/session";
import { SplashRedirect, SplashTarget } from "@/components/splash/splash-redirect";
import { TrevoOneLogo } from "@/components/brand/trevo-one-logo";
import { Button } from "@/components/ui/button";

export default async function Home() {
  let session: UserSession | null = null;
  let sessionLookupFailed = false;

  try {
    session = await getCurrentSession();
  } catch (error) {
    sessionLookupFailed = true;
    if (process.env.NODE_ENV === "development") {
      console.error("[Root Boot] Session lookup encountered an operational error:", error);
    }
  }

  // Se o banco falhar operacionalmente, NÃO tratar como usuário deslogado e NÃO redirecionar
  if (sessionLookupFailed) {
    return (
      <main className="min-h-dvh w-full flex flex-col items-center justify-center p-6 py-12 bg-transparent text-[var(--text-primary)]">
        <div className="flex flex-col items-center text-center max-w-sm w-full px-4 space-y-6">
          <div className="shrink-0 transition-transform duration-200 hover:scale-[1.02]">
            <TrevoOneLogo priority showWordmark size={44} />
          </div>

          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center shadow-2xs">
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
          </div>

          <div className="space-y-2">
            <h1 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">
              Estamos com dificuldade para carregar o Trevo One.
            </h1>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-normal leading-relaxed">
              Tente novamente em instantes.
            </p>
          </div>

          <div className="w-full pt-2">
            <Link href="/" className="block w-full">
              <Button variant="primary" fullWidth size="md" className="font-semibold min-h-[44px]">
                Tentar novamente
              </Button>
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const target: SplashTarget = session ? "/selecionar-consultoria" : "/login";

  return (
    <main className="min-h-dvh w-full flex flex-col items-center justify-between p-6 py-12 bg-transparent text-[var(--text-primary)] selection:bg-[var(--brand-soft)] selection:text-[var(--brand-foreground)]">
      <SplashRedirect target={target} />
      <div className="aria-hidden:true" />

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

      <div className="flex items-center justify-center space-x-2 py-4" aria-label="Carregando">
        <span className="w-2 h-2 rounded-full bg-[var(--brand)] opacity-75 animate-bounce [animation-delay:-0.3s] motion-reduce:animate-none" />
        <span className="w-2 h-2 rounded-full bg-[var(--brand)] opacity-75 animate-bounce [animation-delay:-0.15s] motion-reduce:animate-none" />
        <span className="w-2 h-2 rounded-full bg-[var(--brand)] opacity-75 animate-bounce motion-reduce:animate-none" />
      </div>
    </main>
  );
}
