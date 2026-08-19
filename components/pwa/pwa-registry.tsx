"use client";

import { useEffect, useState } from "react";

/**
 * PwaRegistry — Client Component for Service Worker registration and controlled update management.
 *
 * Responsibilities:
 * - Feature detect navigator.serviceWorker in production runtime.
 * - Register /sw.js with updateViaCache: "none".
 * - Detect waiting Service Workers (updates) while ignoring first-time installations.
 * - Surface a discreet, accessible update notification to the user.
 * - Send SKIP_WAITING message upon explicit user confirmation.
 * - Handle controllerchange safely with an in-memory single-reload guard.
 */
export function PwaRegistry() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);

  useEffect(() => {
    // Only register in production environment
    if (process.env.NODE_ENV !== "production") {
      return;
    }

    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    let refreshing = false;

    // Single-reload guard on controllerchange
    const handleControllerChange = () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    };

    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);

    navigator.serviceWorker
      .register("/sw.js", {
        scope: "/",
        updateViaCache: "none",
      })
      .then((registration) => {
        // Safe lightweight update check on initialization
        registration.update().catch(() => {
          // Non-blocking update check error
        });

        // Case 1: An updated worker is already waiting in background
        if (registration.waiting && navigator.serviceWorker.controller) {
          setWaitingWorker(registration.waiting);
          setShowUpdatePrompt(true);
        }

        // Case 2: An update is found and installed during the current session
        registration.addEventListener("updatefound", () => {
          const installingWorker = registration.installing;
          if (!installingWorker) return;

          installingWorker.addEventListener("statechange", () => {
            // Only prompt if state is installed AND an active controller already exists (not first-ever install)
            if (
              installingWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              setWaitingWorker(installingWorker);
              setShowUpdatePrompt(true);
            }
          });
        });
      })
      .catch((error) => {
        // Non-blocking diagnostic log without exposing user/session data
        if (process.env.NODE_ENV !== "production") {
          console.warn("[PWA] Service Worker registration failed:", error);
        }
      });

    return () => {
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        handleControllerChange
      );
    };
  }, []);

  const handleUpdate = () => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: "SKIP_WAITING" });
    }
  };

  const handleDismiss = () => {
    setShowUpdatePrompt(false);
  };

  if (!showUpdatePrompt) {
    return null;
  }

  return (
    <div
      role="region"
      aria-label="Atualização do aplicativo"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-50 bg-white border border-slate-200 shadow-xl rounded-2xl p-4 flex flex-col gap-3 text-slate-800 animate-in fade-in slide-in-from-bottom-3 duration-200"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-0.5">
          <p className="text-sm font-semibold text-slate-900">
            Nova versão disponível
          </p>
          <p className="text-xs text-slate-600">
            Uma atualização do Trevo One está pronta para ser aplicada.
          </p>
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
        <button
          type="button"
          onClick={handleDismiss}
          className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
        >
          Depois
        </button>
        <button
          type="button"
          onClick={handleUpdate}
          className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#00a859] hover:bg-[#008f4c] rounded-xl shadow-xs transition-colors focus:outline-hidden focus:ring-2 focus:ring-[#00a859] focus:ring-offset-1"
        >
          Atualizar
        </button>
      </div>
    </div>
  );
}
