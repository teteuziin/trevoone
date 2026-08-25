import React, { ReactNode } from "react";
import { TrevoOneLogo } from "../brand/trevo-one-logo";

interface AuthShellProps {
  title: string;
  subtitle: string;
  badge?: string;
  children: ReactNode;
}

export function AuthShell({ title, subtitle, badge, children }: AuthShellProps) {
  return (
    <main className="min-h-dvh w-full flex flex-col items-center justify-center p-4 sm:p-6 lg:p-10 pt-[calc(2rem+env(safe-area-inset-top,0px))] pb-[calc(2rem+env(safe-area-inset-bottom,0px))] bg-gradient-to-b from-[var(--surface-sunken)]/60 via-[var(--background)] to-[var(--background)] text-[var(--text-primary)] selection:bg-[var(--brand-soft)] selection:text-[var(--brand-foreground)]">
      {/* Container Principal */}
      <div className="w-full max-w-[420px] mx-auto flex flex-col items-center space-y-6 my-auto">
        {/* Brand / Logo */}
        <div className="flex flex-col items-center space-y-2">
          <div className="shrink-0 transition-transform duration-200 hover:scale-[1.02]">
            <TrevoOneLogo priority showWordmark size={42} />
          </div>
          {badge && (
            <span className="inline-flex items-center px-3 py-0.5 rounded-full text-xs font-semibold bg-[var(--brand-soft)] text-[var(--brand-foreground)] border border-[var(--brand-soft-border)] shadow-2xs">
              {badge}
            </span>
          )}
        </div>

        {/* Card do Formulário */}
        <div className="w-full bg-[var(--surface)] border border-[var(--border-default)] rounded-3xl p-6 sm:p-8 shadow-sm space-y-5">
          {/* Header do Form */}
          <div className="text-center space-y-1.5">
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[var(--text-primary)]">
              {title}
            </h1>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-medium leading-relaxed">
              {subtitle}
            </p>
          </div>

          {/* Conteúdo Injetado (Formulário) */}
          <div className="w-full">{children}</div>
        </div>

        {/* Rodapé institucional discreto */}
        <p className="text-[11px] text-[var(--text-tertiary)] font-medium text-center tracking-tight select-none">
          Trevo One &bull; Plataforma para consultorias de saúde e treino
        </p>
      </div>
    </main>
  );
}

