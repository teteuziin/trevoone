"use client";

import { useEffect, useState, useRef } from "react";
import {
  checkForAppUpdate,
  applyAppUpdate,
  isSafeToAutoReload,
  shouldAllowReload,
  isIOSDevice,
} from "@/lib/pwa/update-checker";

/**
 * PwaRegistry — Client Component for Service Worker registration and controlled update management.
 *
 * Responsibilities:
 * - Feature detect navigator.serviceWorker in production runtime.
 * - P0 iOS Safe Mode: Prevents Service Worker navigation interception on iOS while
 *   actively running version update checks on resume (visibilitychange, pageshow, focus).
 * - Multi-platform version checking against /api/version for instant release detection.
 * - Loop-protected, non-disruptive auto-updates when client is idle and safe.
 * - Non-blocking, accessible update prompt when client has unsaved form data or active workout.
 * - Zero session loss: cookies, localStorage and IndexedDB data are strictly preserved.
 */
export function PwaRegistry() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [pendingServerVersion, setPendingServerVersion] = useState<string | null>(null);
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);
  const userTriggeredUpdateRef = useRef(false);

  useEffect(() => {
    // Only register in browser production environment
    if (typeof window === "undefined" || process.env.NODE_ENV !== "production") {
      return;
    }

    let isSubscribed = true;
    let activeRegistration: ServiceWorkerRegistration | null = null;
    let refreshing = false;

    /**
     * Checks for application updates from the server.
     * Evaluates dirty state and reload loop guard before triggering reload or prompt.
     */
    const runVersionUpdateCheck = async () => {
      try {
        const result = await checkForAppUpdate();
        if (!isSubscribed || !result.hasUpdate || !result.serverVersion) {
          return;
        }

        setPendingServerVersion(result.serverVersion);

        // Safe auto-update path: idle, no active form/workout, and reload allowed by guard
        if (isSafeToAutoReload() && shouldAllowReload(result.serverVersion)) {
          applyAppUpdate(result.serverVersion);
          return;
        }

        // Dirty or loop-guarded state: present non-blocking notification prompt
        setShowUpdatePrompt(true);
      } catch {
        // Non-blocking update failure
      }
    };

    // P0 iOS Safe Mode: Completely disable SW on iOS to guarantee native WebKit navigation reliability.
    // Self-heal: If an existing SW is registered or controlling, unregister it and clear Trevo SW caches once.
    if (isIOSDevice()) {
      const RECOVERY_KEY = "trevo_ios_sw_recovery_v1";

      const performIOSCleanup = async () => {
        try {
          if (!("serviceWorker" in navigator)) return;
          const hasRecoveryRun = Boolean(sessionStorage.getItem(RECOVERY_KEY));
          const registrations = await navigator.serviceWorker.getRegistrations();
          const trevoRegistrations = registrations.filter((reg) => {
            try {
              const regUrl = new URL(reg.scope);
              return regUrl.origin === window.location.origin;
            } catch {
              return false;
            }
          });

          const hasActiveWorker = Boolean(
            navigator.serviceWorker.controller || trevoRegistrations.length > 0
          );

          if (trevoRegistrations.length > 0) {
            await Promise.all(trevoRegistrations.map((reg) => reg.unregister()));
          }

          if ("caches" in window) {
            const cacheNames = await caches.keys();
            const trevoCaches = cacheNames.filter((name) => name.startsWith("trevo-"));
            await Promise.all(trevoCaches.map((name) => caches.delete(name)));
          }

          // One-time safe reload guard: only reload if an existing SW was active and recovery hasn't run
          if (hasActiveWorker && !hasRecoveryRun) {
            sessionStorage.setItem(RECOVERY_KEY, "1");
            window.location.replace(
              window.location.pathname + window.location.search + window.location.hash
            );
          }
        } catch {
          // Cleanup failure must never crash page rendering
        }
      };

      void performIOSCleanup();
    } else if ("serviceWorker" in navigator) {
      // Non-iOS: Register Service Worker
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
          if (!isSubscribed) return;
          activeRegistration = registration;

          // Safe lightweight update check on initialization
          registration.update().catch(() => {});

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
    }

    // App Resume Listeners: Trigger update check on foreground return, tab focus, or BFCache pageshow
    const handleForegroundResume = () => {
      if (activeRegistration) {
        activeRegistration.update().catch(() => {});
      }
      void runVersionUpdateCheck();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        handleForegroundResume();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pageshow", handleForegroundResume);
    window.addEventListener("focus", handleForegroundResume);

    // Initial check after 2 seconds (allows initial paint and hydration to complete)
    const initialTimer = window.setTimeout(() => {
      void runVersionUpdateCheck();
    }, 2000);

    // Periodic check every 10 minutes while application is actively in foreground
    const periodicTimer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        handleForegroundResume();
      }
    }, 10 * 60 * 1000);

    return () => {
      isSubscribed = false;
      window.clearTimeout(initialTimer);
      window.clearInterval(periodicTimer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pageshow", handleForegroundResume);
      window.removeEventListener("focus", handleForegroundResume);
    };
  }, []);

  const handleUpdate = () => {
    if (waitingWorker) {
      userTriggeredUpdateRef.current = true;
      waitingWorker.postMessage({ type: "SKIP_WAITING" });
      return;
    }

    if (pendingServerVersion) {
      applyAppUpdate(pendingServerVersion, { force: true });
    } else {
      window.location.reload();
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
