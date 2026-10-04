"use client";

import React, { useEffect } from "react";
import { Button } from "@/components/ui/button";

interface StudentEvolutionErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function StudentEvolutionError({
  error,
  reset,
}: StudentEvolutionErrorProps) {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.error("[Student Evolution Error Boundary]", error);
    }
  }, [error]);

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="min-h-[60vh] w-full bg-transparent text-[var(--text-primary)] flex flex-col items-center justify-center p-4 sm:p-6"
    >
      <div className="w-full max-w-md p-6 sm:p-8 rounded-3xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs text-center space-y-5">
        {/* Warning Icon */}
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center shadow-2xs">
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

        {/* User-friendly copy matching Rule 49 */}
        <div className="space-y-1.5">
          <h1 className="text-base sm:text-lg font-bold tracking-tight text-[var(--text-primary)]">
            Não foi possível carregar a evolução
          </h1>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            Ocorreu uma instabilidade temporária ao consultar os dados deste aluno.
          </p>
        </div>

        {/* Actions with touch targets >= 44px (primary 48px) */}
        <div className="pt-2 border-t border-[var(--border-subtle)] space-y-2">
          <Button
            variant="primary"
            size="lg"
            onClick={() => reset()}
            className="w-full min-h-[48px] font-bold text-xs sm:text-sm cursor-pointer"
          >
            Tentar novamente
          </Button>
        </div>
      </div>
    </div>
  );
}
