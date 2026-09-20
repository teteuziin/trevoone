/**
 * TREVO ONE — Real Connectivity & Ping Verification
 *
 * Provides a lightweight two-layer connectivity check:
 * 1. navigator.onLine / event detection (fast heuristic)
 * 2. Real HTTP ping to /api/ping (authoritative server accessibility check)
 */

export type ConnectivityState =
  | "CHECKING"
  | "ONLINE"
  | "OFFLINE"
  | "RECONNECTING"
  | "SYNCING";

/**
 * Checks whether the Trevo One server is actively reachable over the network.
 * Bypasses Service Worker cache by querying dynamic /api/ping with cache: "no-store".
 */
export async function checkRealConnectivity(timeoutMs = 3500): Promise<boolean> {
  if (typeof window === "undefined") {
    return true;
  }

  // Fast check: if browser explicitly knows it has no network interface
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return false;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    // Dynamic timestamp to ensure zero intermediary or browser caching
    const url = `/api/ping?_t=${Date.now()}`;
    const response = await fetch(url, {
      method: "GET",
      cache: "no-store",
      headers: {
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response.status === 204 || response.ok;
  } catch {
    return false;
  }
}
