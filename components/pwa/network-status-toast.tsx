"use client";

import React, { useEffect, useState, useRef } from "react";
import { subscribeToSyncStatus, runOfflineSync } from "@/lib/offline/offline-sync";
import { checkRealConnectivity, type ConnectivityState } from "@/lib/offline/offline-connectivity";

export function NetworkStatusToast() {
  const [connectivityState, setConnectivityState] = useState<ConnectivityState>("CHECKING");
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

  const offlineDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let restoredTimer: ReturnType<typeof setTimeout> | null = null;
    let isCancelled = false;

    // Initial state check: verify real connectivity before claiming online or offline
    checkRealConnectivity()
      .then((isReachable) => {
        if (isCancelled) return;
        setConnectivityState(isReachable ? "ONLINE" : "OFFLINE");
      })
      .catch(() => {
        if (isCancelled) return;
        setConnectivityState("ONLINE");
      });

    const handleOnline = async () => {
      if (offlineDebounceRef.current) {
        clearTimeout(offlineDebounceRef.current);
        offlineDebounceRef.current = null;
      }

      setConnectivityState("RECONNECTING");

      // Verify real connectivity with short timeout
      const isReachable = await checkRealConnectivity(3000);
      if (isCancelled) return;

      if (isReachable) {
        setConnectivityState("ONLINE");
        setShowRestored(true);

        // Auto-trigger sync on confirmed reconnection
        runOfflineSync("").catch(() => {});

        if (restoredTimer) clearTimeout(restoredTimer);
        restoredTimer = setTimeout(() => {
          if (!isCancelled) {
            setShowRestored(false);
          }
        }, 2500);
      } else {
        setConnectivityState("OFFLINE");
      }
    };

    const handleOffline = () => {
      // Debounce flapping to prevent false offline toasts during brief radio handoffs
      if (offlineDebounceRef.current) {
        clearTimeout(offlineDebounceRef.current);
      }

      offlineDebounceRef.current = setTimeout(async () => {
        if (isCancelled) return;
        const isReachable = await checkRealConnectivity(2000);
        if (isCancelled) return;

        if (!isReachable) {
          setConnectivityState("OFFLINE");
          setShowRestored(false);
        } else {
          setConnectivityState("ONLINE");
        }
      }, 500);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    const unsubscribe = subscribeToSyncStatus((status) => {
      if (!isCancelled) {
        setSyncState(status);
      }
    });

    return () => {
      isCancelled = true;
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (offlineDebounceRef.current) clearTimeout(offlineDebounceRef.current);
      if (restoredTimer) clearTimeout(restoredTimer);
      unsubscribe();
    };
  }, []);

  const handleManualSync = async () => {
    await runOfflineSync("");
  };

  // 1. OFFLINE CONFIRMADO: exibe badge de modo offline
  if (connectivityState === "OFFLINE") {
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

  // 2. SINCRONIZANDO: exibe spinner com "Sincronizando..."
  if (syncState.isSyncing || connectivityState === "SYNCING") {
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

  // 6. RESTAURADO / ONLINE (transiente de 2.5s)
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

  // CHECKING ou ONLINE normal: 100% silencioso
  return null;
}
