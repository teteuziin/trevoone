"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { TrevoOneLogo } from "@/components/brand/trevo-one-logo";
import { Button } from "@/components/ui/button";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AppError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    // Development-only safe trace (does not expose in production UI)
    if (process.env.NODE_ENV === "development") {
      console.error("[Trevo One Root Error Boundary]", error);
    }
  }, [error]);

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="min-h-svh w-full bg-[var(--background)] text-[var(--text-primary)] flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 selection:bg-[var(--brand-soft)] selection:text-[var(--brand-foreground)]"
    >
      <div className="w-full max-w-md p-6 sm:p-8 rounded-3xl border border-[var(--border-default)] bg-[var(--surface)] shadow-sm text-center space-y-6">
        {/* Brand Header */}
        <div className="flex justify-center">
          <TrevoOneLogo size={42} showWordmark />
        </div>

        {/* Warning Icon Badge */}
        <div className="w-14 h-14 rounded-2xl bg-[var(--warning-soft)] border border-[var(--warning-border)] text-[var(--warning-foreground)] mx-auto flex items-center justify-center shadow-2xs">
          <svg
            className="w-7 h-7"
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

        {/* User-friendly copy */}
        <div className="space-y-2">
          <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-[var(--text-primary)]">
            Algo não saiu como esperado
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
            Ocorreu um problema inesperado ao carregar esta página. Tente recarregar ou retorne à página inicial.
          </p>
        </div>

        {/* Action Controls */}
        <div className="space-y-2.5 pt-2 border-t border-[var(--border-subtle)]">
          <Button
            variant="primary"
            fullWidth
            size="md"
            onClick={() => reset()}
            className="font-bold min-h-[44px]"
          >
            Tentar novamente
          </Button>

          <Link href="/" className="block w-full">
            <Button
              variant="secondary"
              fullWidth
              size="md"
              className="font-semibold min-h-[44px]"
            >
              Voltar ao início
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
