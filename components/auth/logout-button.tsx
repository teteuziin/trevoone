"use client";

import React, { useState } from "react";
import { performPushCleanup } from "@/components/notifications/notification-bell";
import { clearAllAuthenticatedOfflineData } from "@/lib/offline/offline-storage";

export interface LogoutButtonProps {
  logoutAction: () => Promise<void> | void;
  className?: string;
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  children?: React.ReactNode;
}

const variantStyles: Record<string, string> = {
  primary:
    "bg-[var(--brand)] hover:bg-[var(--brand-hover)] active:bg-[var(--brand-active)] text-white shadow-xs focus-visible:outline-[var(--brand)]",
  secondary:
    "bg-[var(--surface)] hover:bg-[var(--surface-hover)] active:bg-[var(--surface-active)] text-[var(--text-primary)] border border-[var(--border-default)] shadow-xs focus-visible:outline-[var(--brand)]",
  ghost:
    "bg-transparent hover:bg-[var(--surface-hover)] active:bg-[var(--surface-active)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] focus-visible:outline-[var(--brand)]",
  danger:
    "bg-[var(--danger)] hover:bg-[var(--danger-hover)] text-white shadow-xs focus-visible:outline-[var(--danger)]",
  outline:
    "bg-transparent hover:bg-[var(--brand-soft)] text-[var(--brand-foreground)] border border-[var(--brand-soft-border)] focus-visible:outline-[var(--brand)]",
};

const sizeStyles: Record<string, string> = {
  sm: "h-8.5 px-3 text-xs font-semibold gap-1.5 rounded-lg",
  md: "h-10 px-4 text-sm font-semibold gap-2 rounded-lg",
  lg: "h-11.5 px-5 text-base font-semibold gap-2.5 rounded-xl",
};

/**
 * LogoutButton — Client Component that executes secure logout.
 * 1. Checks if un-synced offline records exist in IndexedDB.
 * 2. Warns user before discarding pending operations.
 * 3. Best-effort push notification subscription unregister.
 * 4. Purges all authenticated offline snapshots and active context from IndexedDB.
 * 5. Dispatches server action to revoke session and delete auth cookies.
 */
export function LogoutButton({
  logoutAction,
  className = "",
  variant,
  size,
  fullWidth = false,
  children,
}: LogoutButtonProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncingPending, setIsSyncingPending] = useState(false);
  const [syncErrorMessage, setSyncErrorMessage] = useState<string | null>(null);

  async function executeLogout() {
    setIsLoggingOut(true);
    setShowPendingModal(false);

    try {
      await performPushCleanup();
    } catch {
      // Best-effort
    }

    try {
      await clearAllAuthenticatedOfflineData();
    } catch {
      // Best-effort: offline storage purge failure must never block session logout
    } finally {
      await logoutAction();
    }
  }

  async function handleLogoutSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isLoggingOut) return;

    // Check if there are un-synced offline operations
    try {
      const { getPendingOperationsCount } = await import("@/lib/offline/offline-sync");
      const count = await getPendingOperationsCount();
      if (count > 0) {
        setPendingCount(count);
        setShowPendingModal(true);
        return;
      }
    } catch {
      // If check fails, continue with standard logout
    }

    await executeLogout();
  }

  async function handleSyncBeforeLogout() {
    setIsSyncingPending(true);
    setSyncErrorMessage(null);

    try {
      const { runOfflineSync, getPendingOperationsCount } = await import("@/lib/offline/offline-sync");
      await runOfflineSync("");
      const remaining = await getPendingOperationsCount();
      setPendingCount(remaining);

      if (remaining === 0) {
        // All synced! Proceed with clean logout
        await executeLogout();
      } else {
        setSyncErrorMessage(
          "Não foi possível enviar todas as alterações. Verifique sua conexão ou escolha 'Sair mesmo assim'."
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro na sincronização.";
      setSyncErrorMessage(msg);
    } finally {
      setIsSyncingPending(false);
    }
  }

  const baseClasses = variant
    ? `inline-flex items-center justify-center select-none transition-all duration-150 ease-out cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 disabled:pointer-events-none active:scale-[0.985] ${
        variantStyles[variant] || ""
      } ${sizeStyles[size || "md"] || ""} ${fullWidth ? "w-full" : ""}`
    : "";

  return (
    <>
      <form action={logoutAction} onSubmit={handleLogoutSubmit} className={fullWidth ? "w-full" : "contents"}>
        <button
          type="submit"
          disabled={isLoggingOut}
          className={`${baseClasses} ${className}`.trim()}
        >
          {children || (isLoggingOut ? "Saindo..." : "Sair")}
        </button>
      </form>

      {/* MODAL DE AVISO: ALTERAÇÕES OFFLINE PENDENTES */}
      {showPendingModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="relative w-full max-w-md rounded-3xl bg-[var(--surface)] border border-[var(--border-strong)] p-6 sm:p-7 shadow-2xl space-y-5 text-[var(--text-primary)]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-heading text-base sm:text-lg font-bold text-[var(--text-primary)]">
                  Alterações não sincronizadas
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  {pendingCount} {pendingCount === 1 ? "registro pendente" : "registros pendentes"} no dispositivo
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
              <p>
                Você realizou registros enquanto esteve sem conexão (como treinos ou formulários) que ainda não foram confirmados pelo servidor.
              </p>
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-400">
                Por motivos de segurança e privacidade multiusuário, todos os dados offline deste dispositivo serão excluídos ao sair.
              </div>

              {syncErrorMessage && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400">
                  {syncErrorMessage}
                </div>
              )}
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={isSyncingPending}
                onClick={() => {
                  setShowPendingModal(false);
                  setSyncErrorMessage(null);
                }}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] min-h-[44px] cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={isSyncingPending}
                onClick={executeLogout}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-500/10 min-h-[44px] cursor-pointer"
              >
                Sair mesmo assim
              </button>

              <button
                type="button"
                disabled={isSyncingPending}
                onClick={handleSyncBeforeLogout}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs text-[var(--text-inverse)] bg-[var(--brand)] hover:bg-[var(--brand-hover)] min-h-[44px] shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isSyncingPending ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                      <path
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    <span>Sincronizando...</span>
                  </>
                ) : (
                  <span>Sincronizar agora</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
