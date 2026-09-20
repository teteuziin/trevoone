"use client";

import React, { useEffect, useState } from "react";
import { subscribeToSyncStatus, runOfflineSync } from "@/lib/offline/offline-sync";

export function NetworkStatusToast() {
  const [isOffline, setIsOffline] = useState(() =>
    typeof navigator !== "undefined" ? !navigator.onLine : false
  );
  const [showRestored, setShowRestored] = useState(false);
  const [syncState, setSyncState] = useState<{
    isSyncing: boolean;
    pendingCount: number;
    conflictCount: number;
    lastSyncAt: string | null;
    errorCount: number;
  }>({
    isSyncing: false,
    pendingCount: 0,
    conflictCount: 0,
    lastSyncAt: null,
    errorCount: 0,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    let restoredTimer: ReturnType<typeof setTimeout> | null = null;

    const handleOnline = () => {
      setIsOffline(false);
      setShowRestored(true);

      // Auto-trigger sync on reconnection
      runOfflineSync("").catch(() => {});

      if (restoredTimer) clearTimeout(restoredTimer);
      restoredTimer = setTimeout(() => {
        setShowRestored(false);
      }, 2500);
    };

    const handleOffline = () => {
      setIsOffline(true);
      setShowRestored(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    const unsubscribe = subscribeToSyncStatus((status) => {
      setSyncState(status);
    });

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (restoredTimer) clearTimeout(restoredTimer);
      unsubscribe();
    };
  }, []);

  const handleManualSync = async () => {
    await runOfflineSync("");
  };

  // 1. OFFLINE
  if (isOffline) {
    return (
      <aside
        role="status"
        aria-live="polite"
        className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-3.5 py-1.5 rounded-full shadow-md border text-xs font-medium flex items-center gap-2 transition-all duration-200 animate-in fade-in slide-in-from-top-2 bg-[var(--surface)]/95 text-[var(--text-secondary)] border-[var(--border-default)] backdrop-blur-md"
      >
        <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
        <span>Modo offline</span>
      </aside>
    );
  }

  // 2. SINCRONIZANDO
  if (syncState.isSyncing) {
    return (
      <aside
        role="status"
        aria-live="polite"
        className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-3.5 py-1.5 rounded-full shadow-md border text-xs font-medium flex items-center gap-2 transition-all duration-200 animate-in fade-in slide-in-from-top-2 bg-[var(--surface)]/95 text-[var(--text-primary)] border-[var(--border-default)] backdrop-blur-md"
      >
        <span className="w-3 h-3 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin shrink-0" />
        <span>Sincronizando...</span>
      </aside>
    );
  }

  // 3. CONFLITO
  if (syncState.conflictCount > 0) {
    return (
      <aside
        role="status"
        aria-live="polite"
        className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-3.5 py-1.5 rounded-full shadow-md border text-xs font-medium flex items-center gap-2.5 transition-all duration-200 animate-in fade-in slide-in-from-top-2 bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30 backdrop-blur-md"
      >
        <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
        <span>Precisamos revisar uma alteração</span>
      </aside>
    );
  }

  // 4. FALHA
  if (syncState.errorCount > 0 && syncState.pendingCount > 0) {
    return (
      <aside
        role="status"
        aria-live="polite"
        className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-3.5 py-1.5 rounded-full shadow-md border text-xs font-medium flex items-center justify-between gap-3 transition-all duration-200 animate-in fade-in slide-in-from-top-2 bg-red-500/10 text-red-800 dark:text-red-300 border-red-500/30 backdrop-blur-md"
      >
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
          <span>Não foi possível sincronizar</span>
        </div>
        <button
          type="button"
          onClick={handleManualSync}
          className="font-semibold underline hover:opacity-80 cursor-pointer text-xs shrink-0"
        >
          Tentar novamente
        </button>
      </aside>
    );
  }

  // 5. PENDENTE
  if (syncState.pendingCount > 0) {
    return (
      <aside
        role="status"
        aria-live="polite"
        className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-3.5 py-1.5 rounded-full shadow-md border text-xs font-medium flex items-center justify-between gap-3 transition-all duration-200 animate-in fade-in slide-in-from-top-2 bg-[var(--surface)]/95 text-[var(--text-primary)] border-[var(--border-default)] backdrop-blur-md"
      >
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
          <span>
            {syncState.pendingCount === 1
              ? "1 alteração pendente"
              : `${syncState.pendingCount} alterações pendentes`}
          </span>
        </div>
        <button
          type="button"
          onClick={handleManualSync}
          className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer text-xs shrink-0"
        >
          Sincronizar
        </button>
      </aside>
    );
  }

  // 6. RESTAURADO / ONLINE (transiente silencioso)
  if (showRestored) {
    return (
      <aside
        role="status"
        aria-live="polite"
        className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-3.5 py-1.5 rounded-full shadow-md border text-xs font-medium flex items-center gap-2 transition-all duration-200 animate-in fade-in slide-in-from-top-2 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/30 backdrop-blur-md"
      >
        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
        <span>Conectado</span>
      </aside>
    );
  }

  return null;
}
