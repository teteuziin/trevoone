"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { TrevoOneLogo } from "@/components/brand/trevo-one-logo";
function WifiIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
    </svg>
  );
}

function WifiOffIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M1 1l22 22m-5.29-5.29A9.972 9.972 0 0022.607 9.393M12 20h.01M8.111 16.404a5.5 5.5 0 014.289-1.58m4.089 1.58a5.485 5.485 0 00-1.428-1.026M4.929 12.929A9.96 9.96 0 011.393 9.393m17.678 0a9.963 9.963 0 00-3.32-2.148" />
    </svg>
  );
}

function RotateCcwIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}

function ArrowLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  );
}

export default function OfflinePage() {
  const router = useRouter();
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : false
  );
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleRetry = () => {
    setRetrying(true);
    setTimeout(() => {
      window.location.reload();
    }, 300);
  };

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      window.history.back();
    } else {
      router.push("/");
    }
  };

  return (
    <main className="min-h-dvh w-full flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 bg-transparent text-[var(--foreground)]">
      <div className="w-full max-w-[420px] mx-auto flex flex-col items-center text-center space-y-6">
        {/* Brand Header */}
        <div className="flex items-center gap-2.5">
          <TrevoOneLogo size={40} showWordmark priority />
        </div>

        {/* Status Illustration Card */}
        <div className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col items-center space-y-4">
          <div
            className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors duration-300 ${
              isOnline
                ? "bg-[var(--brand-soft)] text-[var(--brand)]"
                : "bg-amber-500/10 text-amber-500"
            }`}
          >
            {isOnline ? (
              <WifiIcon className="w-8 h-8 animate-pulse" />
            ) : (
              <WifiOffIcon className="w-8 h-8" />
            )}
          </div>

          <div className="space-y-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--foreground)] font-heading">
              {isOnline ? "Conexão restabelecida!" : "Você está sem conexão."}
            </h1>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              {isOnline
                ? "Sua internet voltou. Toque no botão abaixo para recarregar seus dados."
                : "Alguns recursos precisam da internet para carregar dados atualizados. Suas prescrições salvas continuam acessíveis no modo offline."}
            </p>
          </div>

          {/* Badge indicator */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
            <span
              className={`w-2 h-2 rounded-full ${
                isOnline ? "bg-[var(--brand)] animate-ping" : "bg-amber-500"
              }`}
            />
            <span className="text-[var(--text-secondary)]">
              {isOnline ? "Rede detectada" : "Modo Offline ativo"}
            </span>
          </div>

          {/* Action buttons */}
          <div className="w-full pt-2 flex flex-col gap-2.5">
            <button
              type="button"
              onClick={handleRetry}
              disabled={retrying}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-sm bg-[var(--brand)] text-white hover:opacity-95 active:scale-[0.98] transition-all duration-150 shadow-sm disabled:opacity-50"
            >
              <RotateCcwIcon
                className={`w-4 h-4 ${retrying ? "animate-spin" : ""}`}
              />
              <span>{retrying ? "Recarregando..." : "Tentar novamente"}</span>
            </button>

            <button
              type="button"
              onClick={handleBack}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] transition-colors duration-150"
            >
              <ArrowLeftIcon className="w-4 h-4" />
              <span>Voltar</span>
            </button>
          </div>
        </div>

        {/* Footer note */}
        <p className="text-xs text-[var(--text-muted)]">
          Trevo One &bull; Plataforma Multi-Consultoria
        </p>
      </div>
    </main>
  );
}
