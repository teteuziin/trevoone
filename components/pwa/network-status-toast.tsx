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
    lastSyncAt: string | null;
    errorCount: number;
  }>({
    isSyncing: false,
    pendingCount: 0,
    lastSyncAt: null,
    errorCount: 0,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleOnline = () => {
      setIsOffline(false);
      setShowRestored(true);
      // Auto-trigger sync on reconnection
      runOfflineSync("").catch(() => {});

      const timer = setTimeout(() => {
        setShowRestored(false);
      }, 4000);
      return () => clearTimeout(timer);
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
      unsubscribe();
    };
  }, []);

  const handleManualSync = async () => {
    await runOfflineSync("");
  };

  // Determine what to display
  if (isOffline) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl shadow-lg border text-xs font-semibold flex items-center gap-2.5 transition-all duration-300 animate-in fade-in slide-in-from-top-3 max-w-[92vw] sm:max-w-md bg-amber-500/95 text-slate-950 border-amber-600/30 backdrop-blur-md"
      >
        <span className="w-2 h-2 rounded-full bg-amber-900 animate-ping shrink-0" />
        <span>Você está offline. Treinos e formulários continuam disponíveis.</span>
      </div>
    );
  }

  if (syncState.isSyncing) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl shadow-lg border text-xs font-semibold flex items-center gap-2.5 transition-all duration-300 animate-in fade-in slide-in-from-top-3 max-w-[92vw] sm:max-w-md bg-emerald-600/95 text-white border-emerald-500/30 backdrop-blur-md"
      >
        <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
        <span>Sincronizando alterações...</span>
      </div>
    );
  }

  if (syncState.pendingCount > 0) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl shadow-lg border text-xs font-semibold flex items-center justify-between gap-3 transition-all duration-300 animate-in fade-in slide-in-from-top-3 max-w-[92vw] sm:max-w-md bg-emerald-600/95 text-white border-emerald-500/30 backdrop-blur-md"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2 h-2 rounded-full bg-white animate-pulse shrink-0" />
          <span className="truncate">
            {syncState.pendingCount === 1
              ? "1 alteração aguardando sincronização"
              : `${syncState.pendingCount} alterações aguardando sincronização`}
          </span>
        </div>
        <button
          type="button"
          onClick={handleManualSync}
          className="underline font-bold hover:text-emerald-100 cursor-pointer text-xs shrink-0"
        >
          Sincronizar agora
        </button>
      </div>
    );
  }

  if (showRestored) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl shadow-lg border text-xs font-semibold flex items-center gap-2.5 transition-all duration-300 animate-in fade-in slide-in-from-top-3 max-w-[92vw] sm:max-w-md bg-emerald-600/95 text-white border-emerald-500/30 backdrop-blur-md"
      >
        <span className="w-2 h-2 rounded-full bg-white shrink-0" />
        <span>Conexão restabelecida. Tudo sincronizado!</span>
      </div>
    );
  }

  return null;
}
