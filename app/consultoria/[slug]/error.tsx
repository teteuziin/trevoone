"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface ConsultancyErrorProps {
  error: Error & { digest?: string; correlationId?: string; failedStep?: string };
  reset: () => void;
}

function generateDeterministicRef(err: Error): string {
  try {
    const str = `${err.name || "Error"}:${err.message || "Unknown"}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return `REF-${Math.abs(hash).toString(36).toUpperCase().padStart(6, "0").slice(0, 8)}`;
  } catch {
    return "REF-ERR01";
  }
}

export default function ConsultancyError({
  error,
  reset,
}: ConsultancyErrorProps) {
  const [clientRef] = useState<string>(() => {
    return error.digest || error.correlationId || generateDeterministicRef(error);
  });

  const refCode = error.digest || error.correlationId || clientRef;

  useEffect(() => {
    // Sanitized client diagnostic log for troubleshooting
    console.error("[Trevo One Error Boundary]", {
      ref: refCode,
      digest: error.digest,
      correlationId: error.correlationId,
      step: error.failedStep,
      name: error.name,
      message: error.message ? error.message.slice(0, 200) : undefined,
      stack: error.stack ? error.stack.slice(0, 500) : undefined,
    });
  }, [error, refCode]);

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="min-h-svh w-full bg-transparent text-[var(--text-primary)] flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 selection:bg-[var(--brand-soft)] selection:text-[var(--brand-foreground)]"
    >
      <div className="w-full max-w-md p-6 sm:p-8 rounded-3xl border border-[var(--border-default)] bg-[var(--surface)] shadow-sm text-center space-y-6">
        {/* Warning Badge Icon */}
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

        {/* User-friendly copy without technical leaks */}
        <div className="space-y-2">
          <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-[var(--text-primary)]">
            Não foi possível carregar esta área
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
            Ocorreu uma instabilidade temporária ao carregar as informações da sua consultoria. Você pode tentar novamente.
          </p>
          <p className="text-[11px] font-mono text-[var(--text-muted)] pt-1 select-all" title="Código de referência para suporte">
            Ref: {refCode}
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

          <Link href="/selecionar-consultoria" className="block w-full">
            <Button
              variant="secondary"
              fullWidth
              size="md"
              className="font-semibold min-h-[44px]"
            >
              Trocar consultoria
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
