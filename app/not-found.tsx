import Link from "next/link";
import { TrevoOneLogo } from "@/components/brand/trevo-one-logo";
import { Button } from "@/components/ui/button";

export default function RootNotFound() {
  return (
    <main className="min-h-dvh w-full flex flex-col items-center justify-center p-6 bg-transparent text-[var(--text-primary)] selection:bg-[var(--brand-soft)] selection:text-[var(--brand-foreground)]">
      <div className="w-full max-w-md p-6 sm:p-8 rounded-3xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs text-center space-y-6">
        <div className="flex justify-center">
          <TrevoOneLogo size={42} showWordmark />
        </div>

        <div className="w-14 h-14 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-default)] text-[var(--text-tertiary)] mx-auto flex items-center justify-center shadow-2xs font-mono text-base font-bold">
          404
        </div>

        <div className="space-y-2">
          <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-[var(--text-primary)]">
            Página não encontrada
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
            O endereço que você tentou acessar não existe ou foi movido.
          </p>
        </div>

        <div className="pt-2 border-t border-[var(--border-subtle)]">
          <Link href="/" className="block w-full">
            <Button
              variant="primary"
              fullWidth
              size="md"
              className="font-semibold min-h-[44px]"
            >
              Voltar ao início
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
