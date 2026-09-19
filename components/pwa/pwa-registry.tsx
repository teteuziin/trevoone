"use client";

import { useEffect, useState, useRef } from "react";

/**
 * PwaRegistry — Client Component for Service Worker registration and controlled update management.
 *
 * Responsibilities:
 * - Feature detect navigator.serviceWorker in production runtime.
 * - Register /sw.js with updateViaCache: "none".
 * - Detect waiting Service Workers (updates) while ignoring first-time installations.
 * - Surface a discreet, accessible update notification to the user.
 * - Send SKIP_WAITING message ONLY upon explicit user confirmation.
 * - Eliminate reload race conditions: controllerchange only reloads if user explicitly confirmed the update.
 * - Moderate update checks on boot and on document visibility return (no aggressive polling).
 */
export function PwaRegistry() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);
  const userTriggeredUpdateRef = useRef(false);

  useEffect(() => {
    // Only register in production environment
    if (process.env.NODE_ENV !== "production") {
      return;
    }

    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    let refreshing = false;
    let activeRegistration: ServiceWorkerRegistration | null = null;

    // Controlled reload guard: ONLY reload if user explicitly confirmed the update
    const handleControllerChange = () => {
      if (userTriggeredUpdateRef.current && !refreshing) {
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
        activeRegistration = registration;

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
        if (process.env.NODE_ENV !== "production") {
          console.warn("[PWA] Service Worker registration failed:", error);
        }
      });

    // Moderate update check on focus/visibility change (tab return)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && activeRegistration) {
        activeRegistration.update().catch(() => {});
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        handleControllerChange
      );
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const handleUpdate = () => {
    if (waitingWorker) {
      userTriggeredUpdateRef.current = true;
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
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-50 bg-[var(--surface)] border border-[var(--border-default)] shadow-xl rounded-2xl p-4 flex flex-col gap-3 text-[var(--text-primary)] animate-in fade-in slide-in-from-bottom-3 duration-200 depth-surface"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-0.5">
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            Nova versão disponível
          </p>
          <p className="text-xs text-[var(--text-secondary)]">
            Uma atualização do Trevo One está pronta para ser aplicada.
          </p>
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-subtle)]">
        <button
          type="button"
          onClick={handleDismiss}
          className="px-3.5 py-2 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-xl hover:bg-[var(--surface-subtle)] transition-colors min-h-[44px] sm:min-h-0 sm:py-1.5 cursor-pointer"
        >
          Depois
        </button>
        <button
          type="button"
          onClick={handleUpdate}
          className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1 min-h-[44px] sm:min-h-0 sm:py-1.5 cursor-pointer"
        >
          Atualizar
        </button>
      </div>
    </div>
  );
}
