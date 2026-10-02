/**
 * Trevo One — Update Checker & Lifecycle Coordinator
 *
 * Responsibilities:
 * - Poll-free, event-driven update checking on app resume (visibilitychange, pageshow, focus).
 * - Version comparison between bundled client SHA and server version.
 * - Anti-reload-loop protection via sessionStorage guards.
 * - Dirty state awareness: prevents disruptive reloads during active input, workouts, forms, or AI import.
 * - Resilient offline failure tolerance (zero crash on network drop).
 */

import { getAppVersion } from "@/lib/version";

const RELOAD_VERSION_KEY = "trevo_update_reloaded_version";
const RELOAD_TIMESTAMP_KEY = "trevo_update_reloaded_time";
const MIN_CHECK_INTERVAL_MS = 30_000; // 30 seconds throttle
const RELOAD_COOLDOWN_MS = 60_000; // 60 seconds loop protection

let lastCheckTimestamp = 0;
let ongoingCheckPromise: Promise<UpdateCheckResult> | null = null;

export interface UpdateCheckResult {
  hasUpdate: boolean;
  clientVersion: string;
  serverVersion: string | null;
  offline?: boolean;
  error?: string;
}

/**
 * Returns true if the client is running on an iOS device (iPhone, iPad, iPod).
 */
export function isIOSDevice(): boolean {
  if (typeof window === "undefined" || !navigator) return false;
  const ua = navigator.userAgent || "";
  return (
    /iPhone|iPad|iPod/i.test(ua) ||
    (navigator.platform === "MacIntel" && (navigator.maxTouchPoints || 0) > 1)
  );
}

/**
 * Returns true if the app is currently running in standalone PWA mode.
 */
export function isStandalonePWA(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    Boolean((navigator as unknown as { standalone?: boolean }).standalone)
  );
}

/**
 * Determines whether it is currently safe to reload the page without data loss or user disruption.
 */
export function isSafeToAutoReload(): boolean {
  if (typeof document === "undefined" || typeof window === "undefined") {
    return false;
  }

  try {
    // 1. Check if the user is actively focused on a form control
    const active = document.activeElement;
    if (active) {
      const tag = active.tagName.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") {
        return false;
      }
      if (
        active.hasAttribute("contenteditable") &&
        active.getAttribute("contenteditable") !== "false"
      ) {
        return false;
      }
    }

    // 2. Check for explicit dirty markers or open overlays/drawers
    if (
      document.querySelector(
        '[data-trevo-prevent-reload="true"], [data-trevo-dirty="true"], [data-state="open"]'
      )
    ) {
      return false;
    }

    // 3. Check for any dirty forms
    const dirtyForms = document.querySelectorAll('form[data-dirty="true"]');
    if (dirtyForms.length > 0) {
      return false;
    }

    // 4. Critical URL routes where active operations or state exist
    const pathname = window.location.pathname;
    const criticalSubpaths = [
      "/treinos/executar",
      "/nutricao/importar",
      "/treinos/criar",
      "/treinos/editar",
      "/nutricao/criar",
      "/nutricao/editar",
      "/checkin",
      "/formularios/",
      "/onboarding",
    ];

    for (const sub of criticalSubpaths) {
      if (pathname.includes(sub)) {
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Reload Loop Protection: verifies whether a reload is allowed for the target version.
 * If a reload for this exact version was already executed within the cooldown period,
 * returns false to prevent an infinite reload loop.
 */
export function shouldAllowReload(targetVersion: string): boolean {
  if (typeof window === "undefined" || !window.sessionStorage) {
    return false;
  }

  try {
    const lastVersion = sessionStorage.getItem(RELOAD_VERSION_KEY);
    const lastTime = Number(sessionStorage.getItem(RELOAD_TIMESTAMP_KEY) || 0);
    const now = Date.now();

    if (lastVersion === targetVersion && now - lastTime < RELOAD_COOLDOWN_MS) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Records a reload attempt in sessionStorage for loop prevention.
 */
export function recordReloadAttempt(targetVersion: string): void {
  if (typeof window === "undefined" || !window.sessionStorage) return;

  try {
    sessionStorage.setItem(RELOAD_VERSION_KEY, targetVersion);
    sessionStorage.setItem(RELOAD_TIMESTAMP_KEY, String(Date.now()));
  } catch {
    // sessionStorage write failures must not throw
  }
}

/**
 * Clears the reload loop guard once the new version is successfully confirmed active.
 */
export function clearReloadAttempt(): void {
  if (typeof window === "undefined" || !window.sessionStorage) return;

  try {
    sessionStorage.removeItem(RELOAD_VERSION_KEY);
    sessionStorage.removeItem(RELOAD_TIMESTAMP_KEY);
  } catch {
    // Non-blocking
  }
}

/**
 * Checks if a newer version of the application has been deployed on the server.
 *
 * Safe, idempotent, throttled, and non-crashing.
 */
export async function checkForAppUpdate(options?: {
  force?: boolean;
}): Promise<UpdateCheckResult> {
  const clientVersion = getAppVersion();

  if (typeof window === "undefined") {
    return { hasUpdate: false, clientVersion, serverVersion: clientVersion };
  }

  // Check network connectivity
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { hasUpdate: false, clientVersion, serverVersion: null, offline: true };
  }

  const now = Date.now();
  if (!options?.force && now - lastCheckTimestamp < MIN_CHECK_INTERVAL_MS) {
    return { hasUpdate: false, clientVersion, serverVersion: null };
  }

  if (ongoingCheckPromise) {
    return ongoingCheckPromise;
  }

  ongoingCheckPromise = (async () => {
    try {
      lastCheckTimestamp = Date.now();

      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 6000);

      const response = await fetch(`/api/version?_t=${Date.now()}`, {
        method: "GET",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
        },
        cache: "no-store",
        signal: controller.signal,
      });

      window.clearTimeout(timeoutId);

      if (!response.ok) {
        return {
          hasUpdate: false,
          clientVersion,
          serverVersion: null,
          error: `HTTP ${response.status}`,
        };
      }

      const data = (await response.json()) as { version?: string };
      const serverVersion = data.version ? String(data.version).trim() : null;

      if (!serverVersion) {
        return { hasUpdate: false, clientVersion, serverVersion: null };
      }

      // If client and server match, clear any lingering reload attempts
      if (clientVersion === serverVersion) {
        clearReloadAttempt();
        return { hasUpdate: false, clientVersion, serverVersion };
      }

      // Versions differ: an update is available!
      return {
        hasUpdate: true,
        clientVersion,
        serverVersion,
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Network error";
      return {
        hasUpdate: false,
        clientVersion,
        serverVersion: null,
        error: errorMsg,
      };
    } finally {
      ongoingCheckPromise = null;
    }
  })();

  return ongoingCheckPromise;
}

/**
 * Attempts to apply the application update:
 * - If safe (not dirty) and reload is permitted by loop guard: reloads the page.
 * - Returns true if auto-reload was initiated, false otherwise.
 */
export function applyAppUpdate(
  serverVersion: string,
  options?: { force?: boolean }
): boolean {
  if (typeof window === "undefined") return false;

  const isSafe = options?.force ? true : isSafeToAutoReload();
  const canReload = shouldAllowReload(serverVersion);

  if (isSafe && canReload) {
    recordReloadAttempt(serverVersion);
    window.location.reload();
    return true;
  }

  return false;
}
